import expect from 'expect.js';
import verifyKeys from '../../core_plugins/i18n/server/tool/i18n_verify_keys';
import fromRoot from '../../utils/from_root';

describe('Test core translation keys', function () {

  it('Jade template translation keys are translated for English' , function (done) {
    let result = true;
    const parsePaths = [fromRoot('/src/ui/views/*.jade')];
    const translationFiles = fromRoot('/src/core_plugins/kibana/i18n/en.json');
    const keyPattern = 'translate\\(\'(.*)\'\\)';
    const keyPatternRegEx = new RegExp(keyPattern, 'g');

    verifyKeys.verifyTranslationKeys(parsePaths, translationFiles, keyPatternRegEx).then(function (keysNotTranslated) {
      if (keysNotTranslated && Object.keys(keysNotTranslated).length > 0) {
        console.log('The following keys are not translated: ', keysNotTranslated);
        result = false;
      }
      expect(result).to.be(true);
      done();
    }).catch(function (err) {
      console.log(err);
      result = false;
      expect(result).to.be(true);
      done();
    });
  });

  it('Jade template translation keys against incorrect translations' , function (done) {
    let result = true;
    const parsePaths = [fromRoot('/src/ui/views/*.jade'), fromRoot('src/core_plugins/dev_mode/*.js')];
    const translationFiles = [fromRoot('/src/core_plugins/i18n/server/__tests__/data/translations/test_plugin_1/de.json')];
    const keyPattern = 'translate\\(\'(.*)\'\\)';
    const keyPatternRegEx = new RegExp(keyPattern, 'g');

    verifyKeys.verifyTranslationKeys(parsePaths, translationFiles, keyPatternRegEx).then(function (keysNotTranslated) {
      if (keysNotTranslated && Object.keys(keysNotTranslated).length > 0) {
        result = false;
      }
      expect(result).to.be(false);
      done();
    }).catch(function (err) {
      console.log(err);
      result = false;
      expect(result).to.be(true);
      done();
    });
  });
});

