import { connect } from 'react-redux';
import { compose, withState, withHandlers, lifecycle } from 'recompose';
import { find as findWorkpads, remove } from '../../lib/workpad_service';
import { getWorkpad } from '../../state/selectors/workpad';
import { createWorkpad, loadWorkpad, downloadWorkpad } from '../../state/actions/workpad';
import { WorkpadLoader as Component } from './workpad_loader';

const mapStateToProps = (state) => ({
  workpadId: getWorkpad(state).id,
});

const mapDispatchToProps = ({
  createWorkpad,
  loadWorkpad,
  downloadWorkpad,
});

export const WorkpadLoader = compose(
  connect(mapStateToProps, mapDispatchToProps),
  withState('deleteWorkpad', 'setDeleteWorkpad', {}),
  withState('createPending', 'setCreatePending', false),
  withState('searchText', 'setSearchText', ''),
  withState('workpads', 'setWorkpads', null),
  withHandlers({
    findWorkpads: ({ setWorkpads }) => (searchText) => {
      return findWorkpads(searchText).then(setWorkpads);
    },
    removeWorkpad: ({ setWorkpads, workpadId, workpads, loadWorkpad }) => (id) => {
      remove(id).then(() => {
        // update the workpad list, filtering out the removed workpad
        setWorkpads({
          total: workpads.total - 1,
          workpads: workpads.workpads.filter(w => w.id !== id),
        });

        // if load the first available workpad if the active one was removed
        if (workpadId === id) {
          const nextWorkpad = workpads.workpads.find(w => w.id !== id);
          loadWorkpad(nextWorkpad.id);
        }
      });
    },
  }),
  lifecycle({
    componentWillMount() {
      // keep the workpad list in sync
      this.props.findWorkpads();
    },
    componentWillReceiveProps(newProps) {
      // call onClose when pending and the workpad id changes (creation is complete)
      if (this.props.createPending && this.props.workpadId !== newProps.workpadId) this.props.onClose();
    },
  })
)(Component);
