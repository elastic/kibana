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
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { SavedObjectsClientContract } from 'kibana/public';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '../../../../src/plugins/embeddable/public';
import { BookSavedObjectAttributes } from '../../common';
// import { TodoComboEmbeddableComponent } from './todo_combo_component';

export const BOOK_EMBEDDABLE = 'book';
export type BookEmbeddableInput = BookByValueInput | BookByReferenceInput;

interface BookInheritedInput extends EmbeddableInput {
  search?: string;
}

export type BookByValueInput = BookSavedObjectAttributes & BookInheritedInput;
export type BookByReferenceInput = SavedObjectEmbeddableInput & BookInheritedInput;

export function isReferenceInput(input: BookEmbeddableInput): input is BookByReferenceInput {
  return (input as BookByReferenceInput).savedObjectId !== undefined;
}

export interface BookEmbeddableOutput extends EmbeddableOutput {
  hasMatch: boolean;
  savedAttributes?: BookSavedObjectAttributes;
}

/**
 * Returns whether any attributes contain the search string.  If search is empty, true is returned. If
 * there are no savedAttributes, false is returned.
 * @param search - the search string
 * @param savedAttributes - the saved object attributes for the saved object with id `input.savedObjectId`
 */
function getHasMatch(search?: string, savedAttributes?: BookSavedObjectAttributes): boolean {
  if (!search) return true;
  if (!savedAttributes) return false;
  return Boolean(
    (savedAttributes.author && savedAttributes.author.match(search)) ||
      (savedAttributes.title && savedAttributes.title.match(search))
  );
}

export class BookEmbeddable extends Embeddable<BookEmbeddableInput, BookEmbeddableOutput> {
  public readonly type = BOOK_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;
  private savedObjectsClient: SavedObjectsClientContract;
  private savedObjectId?: string;

  constructor(
    initialInput: BookEmbeddableInput,
    {
      parent,
      savedObjectsClient,
    }: {
      parent?: IContainer;
      savedObjectsClient: SavedObjectsClientContract;
    }
  ) {
    super(initialInput, { hasMatch: false }, parent);
    this.savedObjectsClient = savedObjectsClient;

    this.subscription = this.getInput$().subscribe(async () => {
      let savedAttributes: BookSavedObjectAttributes | undefined;
      if (isReferenceInput(this.input)) {
        if (this.savedObjectId !== this.input.savedObjectId) {
          this.savedObjectId = this.input.savedObjectId;
          const todoSavedObject = await this.savedObjectsClient.get<BookSavedObjectAttributes>(
            this.type,
            this.input.savedObjectId
          );
          savedAttributes = todoSavedObject?.attributes;
        }
      } else {
        this.savedObjectId = undefined;
        savedAttributes = this.input;
      }

      this.updateOutput({
        hasMatch: getHasMatch(this.input.search, savedAttributes),
        savedAttributes,
      });
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<div>test</div>, node);
    // ReactDOM.render(<TodoComboEmbeddableComponent embeddable={this} />, node);
  }

  public async reload() {
    if (isReferenceInput(this.input)) {
      this.savedObjectId = this.input.savedObjectId;
      const todoSavedObject = await this.savedObjectsClient.get<BookSavedObjectAttributes>(
        'todo',
        this.input.savedObjectId
      );
      const savedAttributes = todoSavedObject?.attributes;
      this.updateOutput({
        hasMatch: getHasMatch(this.input.search, savedAttributes),
        savedAttributes,
      });
    }
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
