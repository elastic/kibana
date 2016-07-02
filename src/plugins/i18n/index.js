import _ from 'lodash';

export default function ({ Plugin }) {
  return new Plugin({

    install(installContext) {
      _.set(installContext, 'i18n.registerTranslations', function (dir) {
        console.log(`Translation registered at ${dir}`);
      });
    }

  });
};
