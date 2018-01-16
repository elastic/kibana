import $ from 'jquery';

/**
 * This class processes all Vega spec customizations,
 * converting url object parameters into query results.
 */
export class UrlParser {

  constructor(onWarning) {
    this._onWarning = onWarning;
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Update request object
   */
  parseUrl(obj, urlObj) {
    let url = urlObj.url;
    if (!url) {
      throw new Error(`data.url requires a url parameter in a form 'https://example.org/path/subpath'`);
    }

    const query = urlObj.query;
    if (!query) {
      this._onWarning(`Using a "url": {"%type%": "url", "url": ...} should have a "query" sub-object`);
    } else {
      url += (url.includes('?') ? '&' : '?') + $.param(query);
    }

    obj.url = url;
  }

  /**
   * No-op - the url is already set during the parseUrl
   */
  populateData() {
  }

}
