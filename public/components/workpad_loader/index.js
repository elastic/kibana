import { connect } from 'react-redux';
import { compose, withState, withHandlers } from 'recompose';
import fileSaver from 'file-saver';
import * as workpadService from '../../lib/workpad_service';
import { getWorkpad } from '../../state/selectors/workpad';
import { createWorkpad, loadWorkpadById } from '../../state/actions/workpad';
import { WorkpadLoader as Component } from './workpad_loader';

const mapStateToProps = state => ({
  workpadId: getWorkpad(state).id,
});

const mapDispatchToProps = dispatch => ({
  createWorkpad: async workpad => {
    // workpad passed in, create and load it
    if (workpad != null) {
      await workpadService.create(workpad);
      dispatch(loadWorkpadById(workpad.id));
      return;
    }

    dispatch(createWorkpad());
  },
  loadWorkpadById: id => dispatch(loadWorkpadById(id)),
});

export const WorkpadLoader = compose(
  connect(mapStateToProps, mapDispatchToProps),
  withState('workpads', 'setWorkpads', null),
  withHandlers({
    // Workpad search
    findWorkpads: ({ setWorkpads }) => async text => {
      // TODO: handle search failures
      const workpads = await workpadService.find(text);
      setWorkpads(workpads);
    },

    // Workpad import/export methods
    downloadWorkpad: () => async workpadId => {
      // TODO: handle the failed loading state
      const workpad = await workpadService.get(workpadId);
      const jsonBlob = new Blob([JSON.stringify(workpad)], { type: 'application/json' });
      fileSaver.saveAs(jsonBlob, `canvas-workpad-${workpad.name}-${workpad.id}.json`);
    },

    // Remove workpad given an id
    removeWorkpad: props => async workpadId => {
      const { setWorkpads, workpads, workpadId: loadedWorkpad, loadWorkpadById } = props;

      // TODO: handle the failed loading state
      await workpadService.remove(workpadId);

      const remainingWorkpads = workpads.workpads.filter(w => w.id !== workpadId);
      const workpadState = {
        total: remainingWorkpads.length,
        workpads: remainingWorkpads,
      };

      // load the first available workpad if the active one was removed
      if (loadedWorkpad === workpadId) {
        const nextWorkpad = workpadState.workpads[0];
        nextWorkpad && loadWorkpadById(nextWorkpad.id);
      }

      // update the workpad list, filtering out the removed workpad
      setWorkpads(workpadState);
    },
  })
)(Component);
