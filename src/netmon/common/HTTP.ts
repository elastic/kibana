declare const Headers: any;

export default class HTTP {
  private headers: any = new Headers({
    'Content-Type': 'application/json',
    'X-Custom-Header': 'ProcessThisImmediately',
  });
  public $state: ng.ui.IStateService;

  constructor($state?: ng.ui.IStateService) {
    this.$state = $state;
  }

  public fetch(url: string, config: any = { headers: this.headers }, ignoreRequestToken?: boolean) {
    if (!config.headers) {
      config.headers = this.headers;
    } else {
      const headers = this.headers;
      Object.keys(config.headers).forEach(key => headers.set(key, config.headers[key]));
      config.headers = headers;
    }
    return this.fetchUsingToken(url, config, ignoreRequestToken);
  }

  public fetchWithBody(url: string, config: any, ignoreRequestToken?: boolean) {
    if (!config.headers) {
      config.headers = new Headers({});
    }
    return this.fetchUsingToken(url, config, ignoreRequestToken);
  }

  private fetchUsingToken(url: string, config: any, ignoreRequestToken?: boolean) {
    if (!ignoreRequestToken) {
      config.headers.set('Token', localStorage.getItem('token') || '');
    }

    return fetch(url, config).then(response => {
      // TODO: (AW) standardize all HTTP request error handling
      if (response.status === 401 && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return response;
    });
  }
}
