import PropTypes from 'prop-types';
import { compose, branch, renderComponent, renderNothing, withContext } from 'recompose';
import { shortcutManager } from '../../lib/shortcut_manager';
import { AppError } from './app_error';
import { AppComponent as Component } from './app_component';

const branches = [
  branch(({ appReady }) => appReady instanceof Error, renderComponent(AppError)),
  branch(({ appReady }) => appReady.ready === false, renderNothing),
];

export const App = compose(
  ...branches,
  withContext({ shortcuts: PropTypes.object.isRequired }, () => ({ shortcuts: shortcutManager }))
)(Component);

App.propTypes = {
  appReady: PropTypes.object.isRequired,
};
