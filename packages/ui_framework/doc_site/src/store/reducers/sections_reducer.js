import ActionTypes from '../../actions/action_types';

const defaultState = {
  sections: [],
};

export default function sectionsReducer(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.REGISTER_SECTION: {
      const sections = state.sections.slice();
      sections.push({
        id: action.id,
        name: action.name,
      });

      return Object.assign({}, state, {
        sections,
      });
    }

    case ActionTypes.UNREGISTER_SECTION: {
      const sections = state.sections.slice();
      const index = sections.findIndex(section => section.id === action.id);
      sections.splice(index, 1);

      return Object.assign({}, state, {
        sections,
      });
    }

    default:
      break;
  }

  return state;
}
