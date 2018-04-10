import React from 'react';
import PropTypes from 'prop-types';
import { routerProvider } from '../../lib/router_provider';

const getLoadingComponent = msg => <div>{msg || 'Loading...'}</div>;

export class Router extends React.PureComponent {
  static childContextTypes = {
    router: PropTypes.object.isRequired,
  };

  static propTypes = {
    showLoading: PropTypes.bool.isRequired,
    onLoad: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
    restoreRoute: PropTypes.string,
    routes: PropTypes.array.isRequired,
    loadingMessage: PropTypes.string,
    onRouteChange: PropTypes.func,
  };

  static state = {
    router: {},
    activeComponent: getLoadingComponent(),
  };

  getChildContext() {
    const { router } = this.state;
    return { router };
  }

  componentWillMount() {
    // routerProvider is a singleton, and will only ever return one instance
    const { routes, restoreRoute, onRouteChange, onLoad, onError } = this.props;
    const router = routerProvider(routes);

    // when the component in the route changes, render it
    router.onPathChange(route => {
      const { pathname } = route.location;
      const firstLoad = !this.state;

      // if component has no state, this is the first load of the router
      // redirect to last app if trying to load /
      if (firstLoad && pathname === '/') {
        if (restoreRoute && restoreRoute !== pathname) {
          router.redirectTo(this.props.restoreRoute);
          onLoad();
          return;
        }
      }

      const { component } = route.meta;

      if (!component) {
        // TODO: render some kind of 404 page, maybe from a prop?
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`No component defined on route: ${route.name}`);
        }
        return;
      }

      // if this is the first load, execute the route
      if (firstLoad) {
        router
          .execute()
          .then(() => onLoad())
          .catch(err => onError(err));
      }

      // notify upstream handler of route change
      onRouteChange && onRouteChange(pathname);

      this.setState({ activeComponent: component });
    });

    this.setState({ router });
  }

  render() {
    if (this.props.showLoading) return getLoadingComponent(this.props.loadingMessage);
    return React.createElement(this.state.activeComponent, {});
  }
}
