export default function (chrome, internals) {
  chrome.getTranslations = function () {
    return internals.translations || [];
  };
}
