import { get, find, findIndex, map } from 'lodash';
import { safeElementFromExpression } from '../../../common/lib/ast';
import { append } from '../../lib/modify_path';
import { getAssets } from './assets';

const workpadRoot = 'persistent.workpad';

const appendAst = (element) => ({
  ...element,
  ast: safeElementFromExpression(element.expression),
});

// workpad getters
export function getWorkpad(state) {
  return get(state, workpadRoot);
}

export function getWorkpadPersisted(state) {
  return {
    ...getWorkpad(state),
    assets: getAssets(state),
  };
}

// page getters
export function getSelectedPageIndex(state) {
  return get(state, append(workpadRoot, 'page'));
}

export function getSelectedPage(state) {
  const pageIndex =  getSelectedPageIndex(state);
  const pages = getPages(state);
  return get(pages, `[${pageIndex}].id`);
}

export function getPages(state) {
  return get(state, append(workpadRoot, 'pages'));
}

export function getPageById(state, id) {
  return find(getPages(state), { id });
}

export function getPageIndexById(state, id) {
  return findIndex(getPages(state), { id });
}

export function getWorkpadName(state) {
  return get(state, append(workpadRoot, 'name'));
}

export function getWorkpadColors(state) {
  return get(state, append(workpadRoot, 'colors'));
}

export function getAllElements(state) {
  return getPages(state).reduce((elements, page) => elements.concat(page.elements), []);
}

export function getGlobalFilterExpression(state) {
  return map(getAllElements(state), 'filter').filter(str => str != null && str.length).join(' | ');
}

// element getters
export function getSelectedElementId(state) {
  return get(state, 'transient.selectedElement');
}

export function getSelectedElement(state) {
  return getElementById(state, getSelectedElementId(state));
}

export function getElements(state, pageId, withAst = true) {
  const id = pageId || getSelectedPage(state);
  if (!id) return [];

  const page = getPageById(state, id);
  const elements = get(page, 'elements');
  if (!elements) return [];
  if (!withAst) return elements;

  return elements.map(appendAst);
}

export function getElementById(state, id, pageId) {
  const element = find(getElements(state, pageId, false), { id });
  if (element) return appendAst(element);
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

export function getContextForIndex(state, index) {
  return getSelectedResolvedArgs(state, ['expressionContext', index - 1]);
}

export function getRefreshInterval(state) {
  return get(state, 'transient.refresh.interval', 0);
}
