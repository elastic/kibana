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

import sinon from 'sinon';
import $ from 'jquery';

import history from '../history';
import mappings from '../mappings';
import init from '../app';

describe('app initialization', () => {
  const sandbox = sinon.createSandbox();

  let inputMock;
  let outputMock;
  let ajaxDoneStub;
  beforeEach(() => {
    ajaxDoneStub = sinon.stub();
    sandbox.stub($, 'ajax').returns({ done: ajaxDoneStub });
    sandbox.stub(history, 'getSavedEditorState');
    sandbox.stub(mappings, 'startRetrievingAutoCompleteInfo');

    inputMock = {
      update: sinon.stub(),
      moveToNextRequestEdge: sinon.stub(),
      highlightCurrentRequestsAndUpdateActionBar: sinon.stub(),
      updateActionsBar: sinon.stub(),
      getSession: sinon.stub().returns({ on() {} })
    };

    outputMock = {
      update: sinon.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('correctly loads state from any external HTTPS links.', () => {
    const mockContent = {};
    ajaxDoneStub.yields(mockContent);

    init(inputMock, outputMock, 'https://state.link.com/content');

    sinon.assert.calledOnce($.ajax);
    sinon.assert.calledWithExactly($.ajax, {
      url: 'https://state.link.com/content',
      dataType: 'text',
      kbnXsrfToken: false
    });

    sinon.assert.calledTwice(inputMock.moveToNextRequestEdge);
    sinon.assert.calledWithExactly(inputMock.moveToNextRequestEdge, true);
    sinon.assert.calledOnce(inputMock.highlightCurrentRequestsAndUpdateActionBar);
    sinon.assert.calledOnce(inputMock.updateActionsBar);
    sinon.assert.calledOnce(inputMock.update);
    sinon.assert.calledWithExactly(inputMock.update, sinon.match.same(mockContent));

    sinon.assert.calledOnce(outputMock.update);
    sinon.assert.calledWithExactly(outputMock.update, '');
  });

  it('correctly loads state from GitHub API HTTPS links.', () => {
    const mockContent = {};
    ajaxDoneStub.yields(mockContent);

    init(inputMock, outputMock, 'https://api.github.com/content');

    sinon.assert.calledOnce($.ajax);
    sinon.assert.calledWithExactly($.ajax, {
      url: 'https://api.github.com/content',
      dataType: 'text',
      kbnXsrfToken: false,
      headers: { Accept: 'application/vnd.github.v3.raw' }
    });

    sinon.assert.calledTwice(inputMock.moveToNextRequestEdge);
    sinon.assert.calledWithExactly(inputMock.moveToNextRequestEdge, true);
    sinon.assert.calledOnce(inputMock.highlightCurrentRequestsAndUpdateActionBar);
    sinon.assert.calledOnce(inputMock.updateActionsBar);
    sinon.assert.calledOnce(inputMock.update);
    sinon.assert.calledWithExactly(inputMock.update, sinon.match.same(mockContent));

    sinon.assert.calledOnce(outputMock.update);
    sinon.assert.calledWithExactly(outputMock.update, '');
  });
});
