import { withState, lifecycle, compose } from 'recompose';
import { UpdateModal as Component } from './update_modal';
import { get } from 'lodash';
import fetch from 'axios';
import pkg from '../../../package.json';

export const UpdateModal = compose(
  withState('build', 'setBuild', null),
  lifecycle({
    componentDidMount() {
      const { setBuild } = this.props;
      const currentBuild = get(pkg, 'build.count');
      fetch(`https://elastic.github.io/kibana-canvas/preview-microsite/build.json`, {
        method: 'GET',
      })
      .then(res => {
        if (!currentBuild) return;
        if (currentBuild < get(res, 'data.count')) setBuild(res.data.count);
      })
      .catch(() => {
        console.log('Could not fetch remote build info');
      });
    },
  })
)(Component);
