import { get, find } from 'lodash';
import { fromExpression } from '../../../common/lib/ast';

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

export function getElements(state, pageId) {
  const id = pageId || getSelectedPage(state);
  if (!id) return [];

  const page = getPageById(state, id);
  const elements = get(page, 'elements');
  if (!elements) return [];

  return elements.map(element => ({
    ...element,
    ast: fromExpression(element.expression),
  }));
}

export function getElementById(state, id, pageId) {
  return find(getElements(state, pageId), { id });
}

export function getResolvedArgs(state, elementId, path) {
  if (!elementId) return;
  const args = get(state, ['transient', 'resolvedArgs', elementId]);
  if (path) return get(args, path);
  return args;
}

export function getSelectedResolvedArgs(state, path) {
  return getResolvedArgs(state, getSelectedElementId(state), path);
}
