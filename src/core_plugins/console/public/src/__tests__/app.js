import sinon from 'sinon';
import $ from 'jquery';

import history from '../history';
import mappings from '../mappings';
import init from '../app';

describe('app initialization', () => {
  const sandbox = sinon.sandbox.create();

  let inputMock, outputMock;
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
      headers: { Accept: "application/vnd.github.v3.raw" }
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
