import PropTypes from 'prop-types';
import { compose, branch, renderComponent, renderNothing } from 'recompose';
import { AppError } from './app_error';
// import { AppLoading } from './app_loading';
import { AppComponent as Component } from './app_component';

const branches = [
  branch(({ appReady }) => appReady instanceof Error, renderComponent(AppError)),
  branch(({ appReady }) => appReady.ready === false, renderNothing),
];

export const App = compose(
  ...branches
)(Component);

App.propTypes = {
  appReady: PropTypes.object.isRequired,
};
