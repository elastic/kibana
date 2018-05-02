import vfs from 'vinyl-fs';

const NOTICE_COMMENT_RE = /\/\*[\s\n\*]*@notice([\w\W]+?)\*\//g;
const NEWLINE_RE = /\r?\n/g;

/**
 * Generates the text for the NOTICE.txt file at the root of the
 * repo which details the licenses for code that is copied/vendored
 * into the repository.
 *
 * @param  {Object} options
 * @property {string} options.productName Name to print at the top of the notice
 * @property {ToolingLog} options.log
 * @property {string} options.directory absolute path to the repo to search for @notice comments
 * @return {string}
 */
export async function generateNoticeFromSource({ productName, directory, log }) {
  const globs = [
    '**/*.{js,less,css,ts}',
  ];

  const options = {
    cwd: directory,
    nodir: true,
    ignore: [
      '{node_modules,build,target,dist,optimize}/**',
      'packages/*/{node_modules,build,target,dist}/**',
      'x-pack/{node_modules,build,target,dist,optimize}/**',
      'x-pack/packages/*/{node_modules,build,target,dist}/**',
    ]
  };

  log.debug('vfs.src globs', globs);
  log.debug('vfs.src options', options);
  log.info(`Searching ${directory} for multi-line comments starting with @notice`);

  const files = vfs.src(globs, options);
  const noticeComments = [];
  await new Promise((resolve, reject) => {
    files
      .on('data', (file) => {
        log.verbose(`Checking for @notice comments in ${file.relative}`);

        const source = file.contents.toString('utf8');
        let match;
        while ((match = NOTICE_COMMENT_RE.exec(source)) !== null) {
          log.info(`Found @notice comment in ${file.relative}`);
          noticeComments.push(match[1]);
        }
      })
      .on('error', reject)
      .on('end', resolve);
  });

  let noticeText = '';
  noticeText += `${productName}\n`;
  noticeText += `Copyright 2012-${(new Date()).getUTCFullYear()} Elasticsearch B.V.\n`;

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

  log.debug(`notice text:\n\n${noticeText}`);
  return noticeText;
}
