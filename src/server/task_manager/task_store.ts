/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ConcreteTaskInstance, ElasticJs, TaskInstance, TaskStatus } from './task';

const DOC_TYPE = 'doc';

export interface StoreOpts {
  callCluster: ElasticJs;
  index: string;
  maxAttempts: number;
  supportedTypes: string[];
}

export interface FetchOpts {
  searchAfter?: any[];
  sort?: object[];
  query?: object;
}

export interface FetchResult {
  searchAfter: any[];
  docs: ConcreteTaskInstance[];
}

// Internal, the raw document, as stored in the Kibana index.
export interface RawTaskDoc {
  _id: string;
  _index: string;
  _type: string;
  _version: number;
  _source: {
    type: string;
    task: {
      taskType: string;
      runAt: Date;
      interval?: string;
      attempts: number;
      status: TaskStatus;
      params: string;
      state: string;
      user?: string;
      scope?: string | string[];
    };
  };
}

/**
 * Wraps an elasticsearch connection and provides a task manager-specific
 * interface into the index.
 */
export class TaskStore {
  private callCluster: ElasticJs;
  private index: string;
  private maxAttempts: number;
  private supportedTypes: string[];

  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {string[]} supportedTypes - The task types supported by this store
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.maxAttempts = opts.maxAttempts;
    this.supportedTypes = opts.supportedTypes;
  }

  /**
   * Initializes the store, ensuring the task manager index is created and up to date.
   */
  public async init() {
    const properties = {
      type: { type: 'keyword' },
      task: {
        properties: {
          taskType: { type: 'keyword' },
          runAt: { type: 'date' },
          interval: { type: 'text' },
          attempts: { type: 'integer' },
          status: { type: 'keyword' },
          params: { type: 'text' },
          state: { type: 'text' },
          user: { type: 'keyword' },
          scope: { type: 'keyword' },
        },
      },
    };

    try {
      await this.callCluster('indices.create', {
        index: this.index,
        body: {
          mappings: {
            doc: {
              dynamic: 'strict',
              properties,
            },
          },
        },
      });
    } catch (err) {
      if (
        !err.body ||
        !err.body.error ||
        err.body.error.type !== 'resource_already_exists_exception'
      ) {
        throw err;
      }
      return this.callCluster('indices.putMapping', {
        index: this.index,
        type: DOC_TYPE,
        body: {
          properties,
        },
      });
    }
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   */
  public schedule(task: TaskInstance): Promise<RawTaskDoc> {
    return this.callCluster('index', {
      index: this.index,
      type: DOC_TYPE,
      body: rawSource(task),
      refresh: true,
    });
  }

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch(opts: FetchOpts = {}): Promise<FetchResult> {
    const sort = paginatableSort(opts.sort);
    return this.search({
      sort,
      search_after: opts.searchAfter,
      query: opts.query,
    });
  }

  /**
   * Fetches tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - id is not currently running in this instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {TaskQuery} query
   * @prop {string[]} types - Task types to be queried
   * @prop {number} size - The number of task instances to retrieve
   * @returns {Promise<ConcreteTaskInstance[]>}
   */
  public fetchAvailableTasks = async () => {
    const { docs } = await this.search({
      query: {
        bool: {
          must: [
            { terms: { 'task.taskType': this.supportedTypes } },
            { range: { 'task.attempts': { lte: this.maxAttempts } } },
            { range: { 'task.runAt': { lte: 'now' } } },
          ],
        },
      },
      size: 10,
      sort: { 'task.runAt': { order: 'asc' } },
      version: true,
    });

    return docs;
  };

  /**
   * Updates the specified doc in the index, returning the doc
   * with its version up to date.
   *
   * @param {TaskDoc} doc
   * @returns {Promise<TaskDoc>}
   */
  public async update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance> {
    const rawDoc = taskDocToRaw(doc, this.index);

    const { _version } = await this.callCluster('update', {
      body: {
        doc: rawDoc._source,
      },
      id: doc.id,
      index: this.index,
      type: DOC_TYPE,
      version: doc.version,
      // The refresh is important so that if we immediately look for work,
      // we don't pick up this task.
      refresh: true,
    });

    return {
      ...doc,
      version: _version,
    };
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string): Promise<RawTaskDoc> {
    return this.callCluster('delete', {
      id,
      index: this.index,
      type: DOC_TYPE,
      // The refresh is important so that if we immediately look for work,
      // we don't pick up this task.
      refresh: true,
    });
  }

  private async search(opts: any = {}): Promise<FetchResult> {
    const originalQuery = opts.query;
    const queryOnlyTasks = { term: { type: 'task' } };
    const query = originalQuery
      ? { bool: { must: [queryOnlyTasks, originalQuery] } }
      : queryOnlyTasks;

    const result = await this.callCluster('search', {
      type: DOC_TYPE,
      index: this.index,
      body: {
        ...opts,
        query,
      },
    });

    const rawDocs = result.hits.hits;

    return {
      docs: (rawDocs as RawTaskDoc[]).map(rawToTaskDoc),
      searchAfter: (rawDocs.length && rawDocs[rawDocs.length - 1].sort) || [],
    };
  }
}

function paginatableSort(sort: any[] = []) {
  const sortById = { _id: 'desc' };

  if (!sort.length) {
    return [{ 'task.runAt': 'asc' }, sortById];
  }

  if (sort.find(({ _id }) => !!_id)) {
    return sort;
  }

  return [...sort, sortById];
}

function rawSource(doc: ConcreteTaskInstance | TaskInstance) {
  const source = {
    ...doc,
    params: JSON.stringify(doc.params || {}),
    state: JSON.stringify(doc.state || {}),
    attempts: (doc as ConcreteTaskInstance).attempts || 0,
    runAt: doc.runAt || new Date(),
    status: (doc as ConcreteTaskInstance).status || 'idle',
  };

  delete (source as any).id;
  delete (source as any).version;
  delete (source as any).type;

  return {
    type: 'task',
    task: source,
  };
}

function taskDocToRaw(doc: ConcreteTaskInstance, index: string): RawTaskDoc {
  return {
    _id: doc.id,
    _index: index,
    _source: rawSource(doc),
    _type: DOC_TYPE,
    _version: doc.version,
  };
}

function rawToTaskDoc(doc: RawTaskDoc): ConcreteTaskInstance {
  return {
    ...doc._source.task,
    id: doc._id,
    version: doc._version,
    params: parseJSONField(doc._source.task.params, 'params', doc),
    state: parseJSONField(doc._source.task.state, 'state', doc),
  };
}

function parseJSONField(json: string, fieldName: string, doc: RawTaskDoc) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    throw new Error(`Task "${doc._id}"'s ${fieldName} field has invalid JSON: ${json}`);
  }
}
