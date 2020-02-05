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
// import * as esQueryUtils from './es_query';
import {
    Filter as Filter1,
    FILTERS as FILTERS1,
    FilterStateStore as FilterStateStore1,
    buildPhraseFilter as buildPhraseFilter1,
    buildRangeFilter as buildRangeFilter1,
    buildPhrasesFilter as buildPhrasesFilter1,
    buildExistsFilter as buildExistsFilter1,

} from './filters';
import {
    KueryNode as KueryNode1,
    fromKueryExpression as fromKueryExpression1,
    nodeTypes as nodeTypes1,
    toElasticsearchQuery as toElasticsearchQuery1,
} from './kuery';


export namespace esFilters { 
    export type Filter = Filter1;
    export import FILTERS = FILTERS1;
    export import FilterStateStore = FilterStateStore1;
    export const buildPhraseFilter = buildPhraseFilter1;
    export const buildRangeFilter = buildRangeFilter1;
    export const buildPhrasesFilter = buildPhrasesFilter1;
    export const buildExistsFilter = buildExistsFilter1;
}

export namespace esQuery { 
}

export namespace esKuery { 
    export type KueryNode = KueryNode1;

    export const fromKueryExpression = fromKueryExpression1;
    export const nodeTypes = nodeTypes1;
    export const toElasticsearchQuery = toElasticsearchQuery1;
}




// export { esFilters, esQuery, esKuery };
