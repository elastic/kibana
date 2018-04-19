// Generates a migration (either a seed or a transform) and updates the index.js of the
// folder into which the generated migration is placed.

const path = require('path');
const moment = require('moment');
const fs = require('fs');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);

module.exports = {
  generateMigration,
};

async function generateMigration({ pluginDir, fileName, type, template }) {
  const id = migrationId(type, fileName);
  const dir = migrationDir(pluginDir);
  const filePath = path.join(dir, migrationFilename(id, fileName));

  console.log(`Generating "${filePath}"`);

  await ensureDir(dir);
  await writeFile(filePath, template(id));

  const indexPath = await upsertIndexFile(dir, id);

  console.log(`Generated "${filePath}"`);
  console.log(`Updated "${indexPath}"`);
}

function migrationId(type, fileName) {
  return `${moment().format('YYYYMMDDHHmmss')}_${type}_${dropExtension(fileName)}`
    .replace('\'', '\\\'');
}

function dropExtension(s) {
  const ext = path.extname(s);
  return ext ? s.slice(0, -ext.length) : s;
}

function migrationDir(pluginDir) {
  return path.resolve(path.join(pluginDir, 'migrations'));
}

function migrationFilename(id, fileName) {
  return id + (path.extname(fileName) || '.js');
}

async function ensureDir(dir) {
  const exists = await promisify(fs.exists)(dir);
  if (!exists) {
    await promisify(fs.mkdir)(dir);
  }
}

async function upsertIndexFile(dir, id) {
  const { fileExists, filePath } = await findIndexFile(dir, id);
  const upsertFn = fileExists ? updateIndexFile : createIndexFile;
  await upsertFn(filePath, id);
  return filePath;
}

async function findIndexFile(dir) {
  const files = await promisify(fs.readdir)(dir);
  const existingFile = files.find((f) => dropExtension(path.basename(f)) === 'index');
  return {
    filePath: path.join(dir, existingFile || 'index.js'),
    fileExists: !!existingFile,
  };
}

// For existing index files, we'll insert a breaking line of code at the
// end so that the user doesn't forget to import their migration and put
// it in the right spot...
async function updateIndexFile(filePath, id) {
  const originalContent = await promisify(fs.readFile)(filePath);
  const updatedContent = `${originalContent}
    TODO... put this in the right place
    ${generateRequireStatement(id)}`;
  await writeFile(filePath, updatedContent);
}

async function createIndexFile(filePath, id) {
  await writeFile(filePath, indexTemplate(id));
}

function generateRequireStatement(id) {
  return `require('${'./' + id}'),`;
}

function indexTemplate(id) {
  return `// Ordered list of migrations this plugin exports
module.exports = {
  migrations: [
    ${generateRequireStatement(id)}
  ],
};
`;
}
