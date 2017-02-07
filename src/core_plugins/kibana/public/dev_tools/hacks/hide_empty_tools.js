import modules from 'ui/modules';
import chrome from 'ui/chrome';
import DevToolsRegistryProvider from 'ui/registry/dev_tools';

export function hideEmptyDevTools(Private) {
  const hasTools = !!Private(DevToolsRegistryProvider).length;
  if (!hasTools) {
    const navLink = chrome.getNavLinkById('kibana:dev_tools');
    navLink.hidden = true;
  }
}

modules.get('kibana').run(hideEmptyDevTools);
