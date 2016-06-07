var fs = require('fs');
var gm = require('gm').subClass({imageMagick: true});

function compareScreenshots() {
  const BASELINE_SCREENSHOTS_DIR = 'test/screenshots/baseline';
  const DIFF_SCREENSHOTS_DIR = 'test/screenshots/diff';
  const SESSION_SCREENSHOTS_DIR = 'test/screenshots/session';

  fs.readdir(SESSION_SCREENSHOTS_DIR, (err, files) => {
    const screenshots = files.filter(file => file.indexOf('.png') !== -1);
    screenshots.forEach(screenshot => {
      gm().compare(
        `${SESSION_SCREENSHOTS_DIR}/${screenshot}`,
        `${BASELINE_SCREENSHOTS_DIR}/${screenshot}`,
        {
          file: `${DIFF_SCREENSHOTS_DIR}/${screenshot}`
        },
        (err, isEqual, change, raw) => {
          if (err) {
            return console.log(err);
          }
          const changePercentage = (change * 100).toFixed(2);
          console.log(`${screenshot} has changed by ${changePercentage}%`)
        }
      );
    });
  });


}

compareScreenshots();

