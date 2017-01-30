import elements from 'plugins/rework/elements/elements';
import getInitialState from './initial_state';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import _ from 'lodash';
import move from 'lodash-move';

function rootReducer(state = {}, action) {
  const setTransient = (prop, value) => {
    return {...state, transient: {...state.transient, [prop]: value}};
  };

  const setPersistent = (prop, value) => {
    return {...state, persistent: {...state.persistent, [prop]: value}};
  };

  const setWorkpad = (prop, value) => {
    return setPersistent('workpad', {...state.persistent.workpad, [prop]: value});
  };

  const addPage = (page) => {
    const result = setPersistent('pages', {
      ...state.persistent.pages,
      [page.id]: page});

    result.persistent.workpad.pages.push(page.id);
    return result;
  };

  // TODO: Remove all elements
  const removePage = (pageId) => {
    const result = setPersistent('pages', _.omit(state.persistent.pages, pageId));
    result.persistent.workpad.pages = _.without(result.persistent.workpad.pages, pageId);
    return result;
  };

  const setPage = (id, prop, value) => {
    if (!state.persistent.pages[id]) return state;

    return setPersistent('pages', {
      ...state.persistent.pages,
      [id]: {
        ...state.persistent.pages[id],
        [prop]: value
      }});
  };

  const layerElement = (elementId, pageId, newLayer) => {
    const elementList = state.persistent.pages[pageId].elements.slice(0);
    const oldLayer = elementList.indexOf(elementId);
    const newElements = move(elementList, oldLayer, newLayer);
    return setPage(pageId, 'elements', newElements);
  };

  const removeElement = (elementId, pageId) => {
    const result = setPersistent('elements', _.omit(state.persistent.elements, elementId));
    const {pages} = result.persistent;
    const {elementCache} = result.transient;
    // This right here is why you'll have a bad time if you use elements on more than one page.
    // You won't be able to remove them correctly, and its gonna be bad. I guess I could switch to elementRemoveSlowly.
    result.persistent.pages = {...pages, [pageId]: {...pages[pageId], elements: _.without(pages[pageId].elements, elementId)}};
    result.transient.elementCache = _.omit(elementCache, elementId);
    return result;
  };

  const removeDataframe = (dataframeId) => {
    const result = setPersistent('dataframes', _.omit(state.persistent.dataframes, dataframeId));
    result.transient.dataframeCache = _.omit(state.transient.dataframeCache, dataframeId);
    return result;
  };

  const addElement = (element, pageId) => {
    const result = setPersistent('elements', {
      ...state.persistent.elements,
      [element.id]: element});

    result.persistent.pages[pageId].elements.push(element.id);
    return result;
  };

  const setElement = (id, props) => {
    if (!state.persistent.elements[id]) return state;
    return setPersistent('elements', {
      ...state.persistent.elements,
      [id]: {
        ...state.persistent.elements[id],
        ...props
      }});
  };

  const newWorkpad = (workpad) => {
    const persistent = workpad || getInitialState().persistent;
    return {
      app: {...state.app},
      transient: {...getInitialState().transient},
      persistent: {...persistent}
    };
  };

  const { payload, type } = action;
  switch (type) {

    case 'DROPDOWN_TOGGLE':
      return setTransient('dropdown', payload === state.transient.dropdown ? null : payload);
    case 'FULLSCREEN_TOGGLE':
      return setTransient('fullscreen', state.transient.fullscreen ? false : true);
    case 'EDITOR_CLOSE':
      return setTransient('editor', false);
    case 'EDITOR_OPEN':
      return setTransient('editor', true);
    case 'WORKPAD_PROPS':
      return setWorkpad('height', payload);
    case 'WORKPAD_NEW':
      return newWorkpad();
    case 'WORKPAD_LOAD':
      return newWorkpad(payload);
    case 'WORKPAD_REPLACE':
      return setPersistent('workpad', payload);

    case 'PAGE_SET':
      return setWorkpad('page', payload);
    case 'PAGE_ADD':
      return addPage(payload);
    case 'PAGE_REMOVE':
      return removePage(payload);
    case 'PAGE_REPLACE':
      return setPersistent('pages', {...state.persistent.pages, [payload.id]: payload});

    case 'ELEMENT_ADD':
      return addElement(payload.element, payload.pageId);
    case 'ELEMENT_REMOVE':
      return removeElement(payload.elementId, payload.pageId);
    case 'ELEMENT_LAYER':
      return layerElement(payload.elementId, payload.pageId, payload.layer);

    case 'ELEMENT_SELECT':
      return setTransient('selectedElement', payload);
    case 'ELEMENT_PROPS':
      return setElement(payload.id, payload.value);

    case 'DATAFRAME_REMOVE':
      return removeDataframe(payload);

    case 'DATAFRAME_UNRESOLVED':
      return setPersistent('dataframes', {
        ...state.persistent.dataframes,
        [payload.id]: payload});

    case 'DATAFRAME_RESOLVED':
      return setTransient('dataframeCache', {
        ...state.transient.dataframeCache,
        [payload.id]: new Dataframe(payload.value)});

    // Set one resolved argument. We probably don't need the thing above, do we? Grr.
    case 'ARGUMENT_RESOLVED':
      return setTransient('elementCache', {
        ...state.transient.elementCache,
        [payload.id]: {
          ...state.transient.elementCache[payload.id],
          [payload.name]: payload.value
        }});

    // Soooo hideous
    case 'ARGUMENT_UNRESOLVED':
      return setPersistent('elements', {
        ...state.persistent.elements,
        [payload.id]: {
          ...state.persistent.elements[payload.id],
          args: {
            ...state.persistent.elements[payload.id].args,
            [payload.name]: payload.value
          }
        }});

    default:
      return state;
  }
}

export default rootReducer;
