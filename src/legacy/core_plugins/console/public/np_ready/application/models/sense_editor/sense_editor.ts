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

import _ from 'lodash';
import RowParser from '../../../lib/row_parser';
import * as utils from '../../../lib/utils/utils';
// @ts-ignore
import * as es from '../../../lib/es/es';

import { CoreEditor, Position, Range } from '../../../types';
import { createTokenIterator } from '../../factories';

import Autocomplete from '../../../lib/autocomplete/autocomplete';

export class SenseEditor {
  currentReqRange: (Range & { markerRef: any }) | null;
  parser: any;

  // @ts-ignore
  private readonly autocomplete: any;

  constructor(private readonly coreEditor: CoreEditor) {
    this.currentReqRange = null;
    this.parser = new RowParser(this.coreEditor);
    this.autocomplete = new (Autocomplete as any)({
      coreEditor,
      parser: this.parser,
    });
    this.coreEditor.on(
      'tokenizerUpdate',
      this.highlightCurrentRequestsAndUpdateActionBar.bind(this)
    );
    this.coreEditor.on('changeCursor', this.highlightCurrentRequestsAndUpdateActionBar.bind(this));
    this.coreEditor.on('changeScrollTop', this.updateActionsBar.bind(this));
  }

  prevRequestStart = (rowOrPos?: number | Position): Position => {
    let curRow: number;

    if (rowOrPos == null) {
      curRow = this.coreEditor.getCurrentPosition().lineNumber;
    } else if (_.isObject(rowOrPos)) {
      curRow = (rowOrPos as Position).lineNumber;
    } else {
      curRow = rowOrPos as number;
    }

    while (curRow > 0 && !this.parser.isStartRequestRow(curRow, this.coreEditor)) curRow--;

    return {
      lineNumber: curRow,
      column: 1,
    };
  };

  nextRequestStart = (rowOrPos?: number | Position) => {
    let curRow: number;
    if (rowOrPos == null) {
      curRow = this.coreEditor.getCurrentPosition().lineNumber;
    } else if (_.isObject(rowOrPos)) {
      curRow = (rowOrPos as Position).lineNumber;
    } else {
      curRow = rowOrPos as number;
    }
    const maxLines = this.coreEditor.getLineCount();
    for (; curRow < maxLines - 1; curRow++) {
      if (this.parser.isStartRequestRow(curRow, this.coreEditor)) {
        break;
      }
    }
    return {
      row: curRow,
      column: 0,
    };
  };

  autoIndent = _.debounce(async () => {
    await this.coreEditor.waitForLatestTokens();
    const reqRange = await this.getRequestRange();
    if (!reqRange) {
      return;
    }
    const parsedReq = await this.getRequest();

    if (!parsedReq) {
      return;
    }

    if (parsedReq.data && parsedReq.data.length > 0) {
      let indent = parsedReq.data.length === 1; // unindent multi docs by default
      let formattedData = utils.formatRequestBodyDoc(parsedReq.data, indent);
      if (!formattedData.changed) {
        // toggle.
        indent = !indent;
        formattedData = utils.formatRequestBodyDoc(parsedReq.data, indent);
      }
      parsedReq.data = formattedData.data;

      this.replaceRequestRange(parsedReq, reqRange);
    }
  }, 25);

  update = async (data: string, reTokenizeAll = false) => {
    return this.coreEditor.setValue(data, reTokenizeAll);
  };

  replaceRequestRange = (newRequest: any, requestRange: Range) => {
    const text = utils.textFromRequest(newRequest);
    if (requestRange) {
      this.coreEditor.replaceRange(requestRange, text);
    } else {
      // just insert where we are
      this.coreEditor.insert(this.coreEditor.getCurrentPosition(), text);
    }
  };

  getRequestRange = async (lineNumber?: number): Promise<Range | null> => {
    await this.coreEditor.waitForLatestTokens();

    if (this.parser.isInBetweenRequestsRow(lineNumber)) {
      return null;
    }

    const reqStart = this.prevRequestStart(lineNumber);
    const reqEnd = this.nextRequestEnd(reqStart);

    return {
      start: {
        ...reqStart,
      },
      end: {
        ...reqEnd,
      },
    };
  };

  expandRangeToRequestEdges = async (
    range = this.coreEditor.getSelectionRange()
  ): Promise<Range | null> => {
    await this.coreEditor.waitForLatestTokens();

    let startLineNumber = range.start.lineNumber;
    let endLineNumber = range.end.lineNumber;
    const maxLine = Math.max(1, this.coreEditor.getLineCount());

    if (this.parser.isInBetweenRequestsRow(startLineNumber)) {
      /* Do nothing... */
    } else {
      for (; startLineNumber >= 1; startLineNumber--) {
        if (this.parser.isStartRequestRow(startLineNumber)) {
          break;
        }
      }
    }

    if (startLineNumber < 1 || startLineNumber > endLineNumber) {
      return null;
    }
    // move end row to the previous request end if between requests, otherwise walk forward
    if (this.parser.isInBetweenRequestsRow(endLineNumber)) {
      for (; endLineNumber >= startLineNumber; endLineNumber--) {
        if (this.parser.isEndRequestRow(endLineNumber)) {
          break;
        }
      }
    } else {
      for (; endLineNumber <= maxLine; endLineNumber++) {
        if (this.parser.isEndRequestRow(endLineNumber)) {
          break;
        }
      }
    }

    if (endLineNumber < startLineNumber || endLineNumber > maxLine) {
      return null;
    }

    const endColumn =
      (this.coreEditor.getLineValue(endLineNumber) || '').replace(/\s+$/, '').length + 1;
    return {
      start: {
        lineNumber: startLineNumber,
        column: 1,
      },
      end: {
        lineNumber: endLineNumber,
        column: endColumn,
      },
    };
  };

  getRequestInRange = async (range?: Range) => {
    await this.coreEditor.waitForLatestTokens();
    if (!range) {
      return null;
    }
    const request: {
      method: string;
      data: string[];
      url: string | null;
      range: Range;
    } = {
      method: '',
      data: [],
      url: null,
      range,
    };

    const pos = range.start;
    const tokenIter = createTokenIterator({ editor: this.coreEditor, position: pos });
    let t = tokenIter.getCurrentToken();
    if (this.parser.isEmptyToken(t)) {
      // if the row starts with some spaces, skip them.
      t = this.parser.nextNonEmptyToken(tokenIter);
    }
    if (t == null) {
      return null;
    }

    request.method = t.value;
    t = this.parser.nextNonEmptyToken(tokenIter);

    if (!t || t.type === 'method') {
      return null;
    }

    request.url = '';

    while (t && t.type && t.type.indexOf('url') === 0) {
      request.url += t.value;
      t = tokenIter.stepForward();
    }
    if (this.parser.isEmptyToken(t)) {
      // if the url row ends with some spaces, skip them.
      t = this.parser.nextNonEmptyToken(tokenIter);
    }
    let bodyStartLineNumber = (t ? 0 : 1) + tokenIter.getCurrentPosition().lineNumber; // artificially increase end of docs.
    let dataEndPos: Position;
    while (
      bodyStartLineNumber < range.end.lineNumber ||
      (bodyStartLineNumber === range.end.lineNumber && 1 < range.end.column)
    ) {
      dataEndPos = this.nextDataDocEnd({
        lineNumber: bodyStartLineNumber,
        column: 1,
      });
      const bodyRange: Range = {
        start: {
          lineNumber: bodyStartLineNumber,
          column: 1,
        },
        end: dataEndPos,
      };
      const data = this.coreEditor.getValueInRange(bodyRange)!;
      request.data.push(data.trim());
      bodyStartLineNumber = dataEndPos.lineNumber + 1;
    }

    return request;
  };

  getRequestsInRange = async (
    range = this.coreEditor.getSelectionRange(),
    includeNonRequestBlocks = false
  ): Promise<any[]> => {
    await this.coreEditor.waitForLatestTokens();
    if (!range) {
      return [];
    }

    const expandedRange = await this.expandRangeToRequestEdges(range);

    if (!expandedRange) {
      return [];
    }

    const requests: any = [];

    let rangeStartCursor = expandedRange.start.lineNumber;
    const endLineNumber = expandedRange.end.lineNumber;

    // move to the next request start (during the second iterations this may not be exactly on a request
    let currentLineNumber = expandedRange.start.lineNumber;

    const flushNonRequestBlock = () => {
      if (includeNonRequestBlocks) {
        const nonRequestPrefixBlock = this.coreEditor
          .getLines(rangeStartCursor, currentLineNumber - 1)
          .join('\n');
        if (nonRequestPrefixBlock) {
          requests.push(nonRequestPrefixBlock);
        }
      }
    };

    while (currentLineNumber <= endLineNumber) {
      if (this.parser.isStartRequestRow(currentLineNumber)) {
        flushNonRequestBlock();
        const request = await this.getRequest(currentLineNumber);
        if (!request) {
          // Something has probably gone wrong.
          return requests;
        } else {
          requests.push(request);
          rangeStartCursor = currentLineNumber = request.range.end.lineNumber + 1;
        }
      } else {
        ++currentLineNumber;
      }
    }

    flushNonRequestBlock();

    return requests;
  };

  getRequest = async (row?: number) => {
    await this.coreEditor.waitForLatestTokens();
    if (this.parser.isInBetweenRequestsRow(row)) {
      return null;
    }

    const range = await this.getRequestRange(row);
    return this.getRequestInRange(range!);
  };

  moveToPreviousRequestEdge = async () => {
    await this.coreEditor.waitForLatestTokens();
    const pos = this.coreEditor.getCurrentPosition();
    for (
      pos.lineNumber--;
      pos.lineNumber > 1 && !this.parser.isRequestEdge(pos.lineNumber);
      pos.lineNumber--
    ) {
      // loop for side effects
    }
    this.coreEditor.moveCursorToPosition({
      lineNumber: pos.lineNumber,
      column: 1,
    });
  };

  moveToNextRequestEdge = async (moveOnlyIfNotOnEdge: boolean) => {
    await this.coreEditor.waitForLatestTokens();
    const pos = this.coreEditor.getCurrentPosition();
    const maxRow = this.coreEditor.getLineCount();
    if (!moveOnlyIfNotOnEdge) {
      pos.lineNumber++;
    }
    for (
      ;
      pos.lineNumber < maxRow && !this.parser.isRequestEdge(pos.lineNumber);
      pos.lineNumber++
    ) {
      // loop for side effects
    }
    this.coreEditor.moveCursorToPosition({
      lineNumber: pos.lineNumber,
      column: 1,
    });
  };

  nextRequestEnd = (pos: Position): Position => {
    pos = pos || this.coreEditor.getCurrentPosition();
    const maxLines = this.coreEditor.getLineCount();
    let curLineNumber = pos.lineNumber;
    for (; curLineNumber <= maxLines; ++curLineNumber) {
      const curRowMode = this.parser.getRowParseMode(curLineNumber);
      // eslint-disable-next-line no-bitwise
      if ((curRowMode & this.parser.MODE.REQUEST_END) > 0) {
        break;
      }
      // eslint-disable-next-line no-bitwise
      if (curLineNumber !== pos.lineNumber && (curRowMode & this.parser.MODE.REQUEST_START) > 0) {
        break;
      }
    }

    const column =
      (this.coreEditor.getLineValue(curLineNumber) || '').replace(/\s+$/, '').length + 1;

    return {
      lineNumber: curLineNumber,
      column,
    };
  };

  nextDataDocEnd = (pos: Position): Position => {
    pos = pos || this.coreEditor.getCurrentPosition();
    let curLineNumber = pos.lineNumber;
    const maxLines = this.coreEditor.getLineCount();
    for (; curLineNumber < maxLines; curLineNumber++) {
      const curRowMode = this.parser.getRowParseMode(curLineNumber);
      // eslint-disable-next-line no-bitwise
      if ((curRowMode & this.parser.MODE.REQUEST_END) > 0) {
        break;
      }
      // eslint-disable-next-line no-bitwise
      if ((curRowMode & this.parser.MODE.MULTI_DOC_CUR_DOC_END) > 0) {
        break;
      }
      // eslint-disable-next-line no-bitwise
      if (curLineNumber !== pos.lineNumber && (curRowMode & this.parser.MODE.REQUEST_START) > 0) {
        break;
      }
    }

    const column =
        (this.coreEditor.getLineValue(curLineNumber) || '').length +
        1 /* Range goes to 1 after last char */;

    return {
      lineNumber: curLineNumber,
      column,
    };
  };

  highlightCurrentRequestsAndUpdateActionBar = _.debounce(async () => {
    await this.coreEditor.waitForLatestTokens();
    const expandedRange = await this.expandRangeToRequestEdges();
    if (expandedRange === null && this.currentReqRange === null) {
      return;
    }
    if (
      expandedRange !== null &&
      this.currentReqRange !== null &&
      expandedRange.start.lineNumber === this.currentReqRange.start.lineNumber &&
      expandedRange.end.lineNumber === this.currentReqRange.end.lineNumber
    ) {
      // same request, now see if we are on the first line and update the action bar
      const cursorLineNumber = this.coreEditor.getCurrentPosition().lineNumber;
      if (cursorLineNumber === this.currentReqRange.start.lineNumber) {
        this.updateActionsBar();
      }
      return; // nothing to do..
    }

    if (this.currentReqRange) {
      this.coreEditor.removeMarker(this.currentReqRange.markerRef);
    }

    this.currentReqRange = expandedRange as any;
    if (this.currentReqRange) {
      this.currentReqRange.markerRef = this.coreEditor.addMarker(this.currentReqRange);
    }
    this.updateActionsBar();
  }, 25);

  getRequestsAsCURL = async (elasticsearchBaseUrl: string, range?: Range): Promise<string> => {
    const requests = await this.getRequestsInRange(range, true);
    const result = _.map(requests, req => {
      if (typeof req === 'string') {
        // no request block
        return req;
      }

      const esPath = req.url;
      const esMethod = req.method;
      const esData = req.data;

      // this is the first url defined in elasticsearch.hosts
      const url = es.constructESUrl(elasticsearchBaseUrl, esPath);

      let ret = 'curl -X' + esMethod + ' "' + url + '"';
      if (esData && esData.length) {
        ret += " -H 'Content-Type: application/json' -d'\n";
        const dataAsString = utils.collapseLiteralStrings(esData.join('\n'));
        // since Sense doesn't allow single quote json string any single qoute is within a string.
        ret += dataAsString.replace(/'/g, '\\"');
        if (esData.length > 1) {
          ret += '\n';
        } // end with a new line
        ret += "'";
      }
      return ret;
    });

    return result.join('\n');
  };

  updateActionsBar = () => this.coreEditor.legacyUpdateUI(this.currentReqRange);

  getCoreEditor() {
    return this.coreEditor;
  }
}
