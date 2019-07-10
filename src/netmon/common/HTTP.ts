declare const Headers: any;

export default class HTTP {
  private headers: any = new Headers({
    'Content-Type': 'application/json',
    'X-Custom-Header': 'ProcessThisImmediately',
  });

  constructor() {}

  public fetch(
    url: string,
    config: any = { headers: this.headers },
    ignoreRequestToken?: boolean,
    ignoreResponseToken?: boolean
  ) {
    if (!config.headers) {
      config.headers = this.headers;
    } else {
      const headers = this.headers;
      Object.keys(config.headers).forEach(key => headers.set(key, config.headers[key]));
      config.headers = headers;
    }
    return this.fetchUsingToken(url, config, ignoreRequestToken, ignoreResponseToken);
  }

  public fetchWithBody(
    url: string,
    config: any,
    ignoreRequestToken?: boolean,
    ignoreResponseToken?: boolean
  ) {
    if (!config.headers) {
      config.headers = new Headers({});
    }
    return this.fetchUsingToken(url, config, ignoreRequestToken, ignoreResponseToken);
  }

  private fetchUsingToken(
    url: string,
    config: any,
    ignoreRequestToken?: boolean,
    ignoreResponseToken?: boolean
  ) {
    if (!ignoreRequestToken) {
      config.headers.set('Token', localStorage.getItem('token') || '');
    }

    return fetch(url, config).then(response => {
      let token = response.headers.get('Token');
      if (token && !ignoreResponseToken) {
        localStorage.setItem('token', token);
      }
      return response;
    });
  }
}
