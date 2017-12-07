import { withState, lifecycle, compose } from 'recompose';
import Markdown from 'markdown-it';
import { get } from 'lodash';
import fetch from 'axios';
import pkg from '../../../package.json';
import { UpdateModal as Component } from './update_modal';

const siteUrl = 'http://canvas.elastic.co';

export const UpdateModal = compose(
  withState('build', 'setBuild', null),
  withState('changes', 'setChanges', null),
  lifecycle({
    componentDidMount() {
      const { setBuild, setChanges } = this.props;
      const currentBuild = Number(get(pkg, 'build.git.count'));
      if (!currentBuild) return;

      fetch(`${siteUrl}/preview-microsite/build.json`)
      .then((build) => {
        const buildNum = Number(get(build, 'data.buildNumber'));

        if (currentBuild < buildNum) {
          fetch(`${siteUrl}/changelog.md`)
          .then(res => res.data)
          .then((changelog) => {
            const changes = changelog.split('---')[0];
            const md = new Markdown();
            setChanges(md.render(String(changes)));
            setBuild(buildNum);
          })
          .catch(() => {
            console.log('Could not fetch changelog');
            setBuild(buildNum);
          });
        }
      })
      .catch(() => {
        console.log('Could not fetch remote build info');
      });
    },
  })
)(Component);
