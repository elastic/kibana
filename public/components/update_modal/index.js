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
      const currentBuild = Number(get(pkg, 'build.git.count'));
      if (!currentBuild) return;

      fetch(`https://elastic.github.io/kibana-canvas/preview-microsite/build.json`, {
        method: 'GET',
      })
      .then(res => {
        const buildNum = Number(get(res, 'data.buildNumber'));
        if (currentBuild < buildNum) setBuild(buildNum);
      })
      .catch(() => {
        console.log('Could not fetch remote build info');
      });
    },
  })
)(Component);
