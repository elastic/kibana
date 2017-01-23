import elements from 'plugins/rework/elements/elements';
import initialState from './initial_state';
import _ from 'lodash';

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
    return setPersistent('pages', {
      ...state.persistent.pages,
      [id]: {
        ...state.persistent.pages[id],
        [prop]: value
      }});
  };

  const removeElement = (elementId) => {
    const result = setPersistent('elements', _.omit(state.persistent.elements, elementId));
    // Gross, loop over all pages and remove this element from all of them, even though it should only
    // be on one. So gross.
    result.persistent.pages = _.mapValues(result.persistent.pages, (page) => {
      page.elements = _.without(page.elements, elementId);
      return page;
    });
    return result;
  };

  const addElement = (element, pageId) => {
    const result = setPersistent('elements', {
      ...state.persistent.elements,
      [element.id]: element});

    result.persistent.pages[pageId].elements.push(element.id);
    return result;
  };

  const setElement = (id, prop, value) => {
    return setPersistent('elements', {
      ...state.persistent.elements,
      [id]: {
        ...state.persistent.elements[id],
        [prop]: value
      }});
  };

  const newWorkpad = () => {
    return {
      app: {...state.app},
      transient: {...initialState.transient},
      persistent: {...initialState.persistent}
    };
  };

  const { payload, type } = action;
  switch (type) {

    case 'DROPDOWN_TOGGLE':
      return setTransient('dropdown', payload === state.transient.dropdown ? null : payload);
    case 'EDITOR_CLOSE':
      return setTransient('editor', false);
    case 'EDITOR_OPEN':
      return setTransient('editor', true);
    case 'WORKPAD_HEIGHT':
      return setWorkpad('height', payload);
    case 'WORKPAD_WIDTH':
      return setWorkpad('width', payload);
    case 'WORKPAD_NAME':
      return setWorkpad('name', payload);
    case 'WORKPAD_NEW':
      return newWorkpad();

    case 'PAGE_SET':
      return setWorkpad('page', payload);
    case 'PAGE_ADD':
      return addPage(payload);
    case 'PAGE_REMOVE':
      return removePage(payload);

    case 'ELEMENT_ADD':
      return addElement(payload.element, payload.pageId);
    case 'ELEMENT_REMOVE':
      return removeElement(payload.elementId, payload.pageId);

    case 'ELEMENT_SELECT':
      return setTransient('selectedElement', payload);
    case 'ELEMENT_ANGLE':
      return setElement(payload.id, 'angle', payload.value);
    case 'ELEMENT_HEIGHT':
      return setElement(payload.id, 'height', payload.value);
    case 'ELEMENT_WIDTH':
      return setElement(payload.id, 'width', payload.value);
    case 'ELEMENT_TOP':
      return setElement(payload.id, 'top', payload.value);
    case 'ELEMENT_LEFT':
      return setElement(payload.id, 'left', payload.value);

    case 'DATAFRAME_UNRESOLVED':
      return setPersistent('dataframes', {
        ...state.persistent.dataframes,
        [payload.id]: payload});

    case 'DATAFRAME_RESOLVED':
      return setTransient('dataframeCache', {
        ...state.transient.dataframeCache,
        [payload.id]: payload.value});

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
