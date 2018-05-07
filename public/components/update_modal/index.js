import { withState, lifecycle, compose } from 'recompose';
import Markdown from 'markdown-it';
import { get } from 'lodash';
import fetch from 'axios';
import pkg from '../../../package.json';
import { UpdateModal as Component } from './update_modal';

const siteUrl = 'https://canvas.elastic.co';

export const UpdateModal = compose(
  withState('filename', 'setFilename', null),
  withState('changes', 'setChanges', null),
  lifecycle({
    componentDidMount() {
      const { setFilename, setChanges } = this.props;
      const currentBuild = Number(get(pkg, 'build.git.count'));
      if (!currentBuild) return;

      fetch(`${siteUrl}/build.json`)
        .then(build => {
          const buildNum = Number(get(build, 'data.buildNumber'));
          const buildFile = get(build, 'data.filename');

          if (currentBuild < buildNum) {
            fetch(`${siteUrl}/changelog.md`)
              .then(res => res.data)
              .then(changelog => {
                const changes = changelog.split('---')[0];
                const md = new Markdown({ html: false });
                setChanges(md.render(String(changes)));
                setFilename(buildFile);
              })
              .catch(() => {
                console.log('Could not fetch changelog');
                setFilename(buildFile);
              });
          }
        })
        .catch(() => {
          console.log('Could not fetch remote build info');
        });
    },
  })
)(Component);
