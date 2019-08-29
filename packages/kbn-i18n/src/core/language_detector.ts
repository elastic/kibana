import LanguageDetector from 'i18next-browser-languagedetector';

export function getUserLanguage() {
  const services = {
    languageUtils: {
      formatLanguageCode(lng: string) {
        console.log('lng::', lng);
        return lng;
      },
      isWhitelisted(lng: string) {
        return true;
      },
    }
  }
  const languageDetector = new LanguageDetector(services, {});
  console.log('languageDetector:', languageDetector);
  const language = languageDetector.detect();
  console.log('language:', language);
}
