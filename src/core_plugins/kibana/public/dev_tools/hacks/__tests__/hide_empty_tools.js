import expect from 'expect.js';
import sinon from 'sinon';

import chrome from 'ui/chrome';
import { hideEmptyDevTools } from '../hide_empty_tools';

describe('hide dev tools', function () {
  let navlinks;

  function PrivateWithoutTools() {
    return [];
  }

  function PrivateWithTools() {
    return ['tool1', 'tool2'];
  }

  function isHidden() {
    return !!chrome.getNavLinkById('kibana:dev_tools').hidden;
  }

  beforeEach(function () {
    navlinks = {};
    sinon.stub(chrome, 'getNavLinkById',function () {
      return navlinks;
    });
  });

  it('should hide the app if there are no dev tools', function () {
    hideEmptyDevTools(PrivateWithTools);
    expect(isHidden()).to.be(false);
  });

  it('should not hide the app if there are tools', function () {
    hideEmptyDevTools(PrivateWithoutTools);
    expect(isHidden()).to.be(true);
  });

  afterEach(function () {
    chrome.getNavLinkById.restore();
  });
});
