import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { initializeWorkpad } from '../../../state/actions/workpad';
import { getWorkpad, getSelectedPage } from '../../../state/selectors/workpad';
import { LoadWorkpad } from './load_workpad';
import { ExportApp as Component } from './export_app';

const mapStateToProps = state => ({
  workpad: getWorkpad(state),
  selectedPageId: getSelectedPage(state),
});

const mapDispatchToProps = dispatch => ({
  initializeWorkpad() {
    dispatch(initializeWorkpad());
  },
});

const branches = [branch(({ workpad }) => workpad == null, renderComponent(LoadWorkpad))];

export const ExportApp = compose(connect(mapStateToProps, mapDispatchToProps), ...branches)(
  Component
);
