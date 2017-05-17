import { get, find } from 'lodash';

// page getters
export function getSelectedPage(state) {
  return get(state, 'transient.selectedPage');
}

export function getPages(state) {
  return get(state, 'persistent.workpad.pages');
}

export function getPageById(state, id) {
  return find(getPages(state), { id });
}

// element getters
export function getSelectedElementId(state) {
  return get(state, 'transient.selectedElement');
}

export function getSelectedElement(state) {
  return getElementById(state, getSelectedElementId(state));
}

export function getElements(state, pageId = null) {
  const id = pageId || getSelectedPage(state);
  if (!id) return;

  const page = getPageById(state, id);
  return (page) ? page.elements : undefined;
}

export function getElementById(state, id) {
  return find(getElements(state), { id });
}

export function getResolvedArgs(state, elementId) {
  if (!elementId) return;
  return get(state, ['transient', 'resolvedArgs', elementId]);
}

export function getSelectedResolvedArgs(state) {
  return getResolvedArgs(state, getSelectedElementId(state));
}
