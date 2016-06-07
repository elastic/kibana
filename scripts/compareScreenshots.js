
const fs = require('fs');
const gm = require('gm').subClass({imageMagick: true});
const path = require('path');

function compareScreenshots() {
  const BASELINE_SCREENSHOTS_DIR = path.resolve('test','screenshots','baseline');
  const DIFF_SCREENSHOTS_DIR = path.resolve('test','screenshots','diff');
  const SESSION_SCREENSHOTS_DIR = path.resolve('test','screenshots','session');

  fs.readdir(SESSION_SCREENSHOTS_DIR, (readDirError, files) => {
    const screenshots = files.filter(file => file.indexOf('.png') !== -1);
    screenshots.forEach(screenshot => {
      gm().compare(
        `${SESSION_SCREENSHOTS_DIR}/${screenshot}`,
        `${BASELINE_SCREENSHOTS_DIR}/${screenshot}`,
        {
          file: `${DIFF_SCREENSHOTS_DIR}/${screenshot}`
        },
        (comparisonError, isEqual, change, raw) => {
          if (comparisonError) {
            return console.log(comparisonError);
          }
          const changePercentage = (change * 100).toFixed(2);
          console.log(`${screenshot} has changed by ${changePercentage}%`)
        }
      );
    });
  });
}

compareScreenshots();
