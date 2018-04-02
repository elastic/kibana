import vfs from 'vinyl-fs';

import { REPO_ROOT } from '../constants';

const NOTICE_COMMENT_RE = /\/\*[\s\n\*]*@notice([\w\W]+?)\*\//g;
const NEWLINE_RE = /\r\n|[\n\r\u2028\u2029]/g;

export async function generateNoticeText() {
  const files = vfs.src([
    '**/*.{js,less,css}',
  ], {
    cwd: REPO_ROOT,
    nodir: true,
    ignore: [
      '{node_modules,build,target,dist}/**',
      'packages/*/{node_modules,build,target,dist}/**',
    ]
  });

  const noticeComments = [];
  await new Promise((resolve, reject) => {
    files
      .on('data', (file) => {
        const source = file.contents.toString('utf8');
        let match;
        while ((match = NOTICE_COMMENT_RE.exec(source)) !== null) {
          noticeComments.push(match[1]);
        }
      })
      .on('error', reject)
      .on('end', resolve);
  });

  let noticeText = '';
  noticeText += 'Kibana\n';
  noticeText += `Copyright 2012-${(new Date()).getUTCFullYear()} Elasticsearch\n`;

  for (const comment of noticeComments.sort()) {
    noticeText += '\n---\n';
    noticeText += comment
      .split(NEWLINE_RE)
      .map(line => (
        line
          // trim whitespace
          .trim()
          // trim leading * and a single space
          .replace(/(^\* ?)/, '')
      ))
      .join('\n')
      .trim();
    noticeText += '\n';
  }

  noticeText += '\n';

  return noticeText;
}
