const fs = require('fs');
const path = require('path');
const exists = (p) => fs.existsSync(path.join(__dirname, p));
if (!exists('node_modules') || !exists('node_modules/.yarn-state.yml')) {
  console.log('node_modules or .yarn-state.yml not found, running yarn install');
  require('child_process').execSync('./.yarn/releases/yarn-3.3.0.cjs install', {
    stdio: 'inherit',
  });
}
setTimeout(() => {
  require('./.yarn/releases/yarn-3.3.0.cjs');
}, 50);
