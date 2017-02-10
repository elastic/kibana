import _ from 'lodash';
import move from 'lodash-move';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import getInitialState from 'plugins/rework/state/initial_state';

function rootReducer(state = {}, action) {
  const setTransient = (prop, value) => {
    return {...state, transient: {...state.transient, [prop]: value}};
  };

  const setPersistent = (prop, value) => {
    return {...state, persistent: {...state.persistent, [prop]: value}};
  };

  const setWorkpad = (props) => {
    const { transient } = state;
    const workpad = {...state.persistent.workpad, ...props};
    const workpads = transient.workpads.map(pad => {
      if (pad.id === workpad.id) {
        return workpad;
      }
      return pad;
    });

    return {
      ...state,
      transient: {
        ...state.transient,
        workpads,
      },
      persistent: {
        ...state.persistent,
        workpad: {...state.persistent.workpad, ...props},
      },
    };
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
    const { workpads } = state.transient;
    const { transient, persistent } = getInitialState();
    workpads.unshift(persistent.workpad);

    return {
      app: {...state.app},
      transient: {...transient, workpads},
      persistent: {...persistent}
    };
  };

  const loadWorkpad = (workpad) => {
    const persistent = workpad;
    return {
      ...state,
      persistent
    };
  };

  const deleteWorkpad = (id) => {
    const { transient } = state;
    const index = transient.workpads.map(workpad => workpad.id).indexOf(id);

    // TODO: handle removal of non-existing workpads
    if (index < 0) return { ...state };

    const workpads = [...transient.workpads];
    workpads.splice(index, 1);
    return setTransient('workpads', workpads);
  };


  const { payload, type, error } = action;
  switch (type) {

    case 'DROPDOWN_TOGGLE':
      if (payload.type === state.transient.dropdown.type) {
        return setTransient('dropdown', {
          type: null,
          meta: null,
        });
      }
      return setTransient('dropdown', payload);
    case 'DROPDOWN_OPEN':
      return setTransient('dropdown', payload);
    case 'DROPDOWN_CLOSE':
      return setTransient('dropdown', null);

    case 'FULLSCREEN_TOGGLE':
      return setTransient('fullscreen', state.transient.fullscreen ? false : true);

    case 'EDITOR_CLOSE':
      return setTransient('editor', false);
    case 'EDITOR_OPEN':
      return setTransient('editor', true);

    case 'WORKPAD_PROPS':
      return setWorkpad(payload);
    case 'WORKPAD_NEW':
      return newWorkpad();
    case 'WORKPAD_LOAD':
      return loadWorkpad(payload);
    case 'WORKPAD_LOAD_ALL':
      if (error || !payload) {
        // TODO: handle workpad fetch error
        console.log('Load all failed', payload);
        return setTransient('workpads', []);
      }
      return setTransient('workpads', payload);

    case 'WORKPAD_REPLACE':
      return setPersistent('workpad', payload);
    case 'WORKPAD_DELETE_START':
      return deleteWorkpad(payload);

    case 'PAGE_SET':
      return setWorkpad({page: payload});
    case 'PAGE_SET_ORDER':
      return setWorkpad({pages: payload});
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

    case 'FILTER_SET':
      return setPersistent('filters', {...state.persistent.filters, [payload.id]: payload});

    case 'DATAFRAME_REMOVE':
      return removeDataframe(payload);
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
    case 'ARGUMENTS_RESOLVED':
      return setTransient('elementCache', {
        ...state.transient.elementCache,
        [payload.id]: {
          ...state.transient.elementCache[payload.id],
          ...payload.value
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
