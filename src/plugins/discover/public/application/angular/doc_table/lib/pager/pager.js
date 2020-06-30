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

function clamp(val, min, max) {
  return Math.min(Math.max(min, val), max);
}

export class Pager {
  constructor(totalItems, pageSize, startingPage) {
    this.currentPage = startingPage;
    this.totalItems = totalItems;
    this.pageSize = pageSize;
    this.startIndex = 0;
    this.updateMeta();
  }

  get pageCount() {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get hasNextPage() {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage() {
    return this.currentPage > 1;
  }

  nextPage() {
    this.currentPage += 1;
    this.updateMeta();
  }

  previousPage() {
    this.currentPage -= 1;
    this.updateMeta();
  }

  setTotalItems(count) {
    this.totalItems = count;
    this.updateMeta();
  }

  setPageSize(count) {
    this.pageSize = count;
    this.updateMeta();
  }

  updateMeta() {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.currentPage = clamp(this.currentPage, 1, this.totalPages);

    this.startItem = (this.currentPage - 1) * this.pageSize + 1;
    this.startItem = clamp(this.startItem, 0, this.totalItems);

    this.endItem = this.startItem - 1 + this.pageSize;
    this.endItem = clamp(this.endItem, 0, this.totalItems);

    this.startIndex = this.startItem - 1;
  }
}
