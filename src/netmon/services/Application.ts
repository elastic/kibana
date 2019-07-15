import HTTP from '../common/http';

export interface IApplicationData {
  name: string;
  user: any;
  logo: string;
  shortName: string;
  companyName: string;
  licensedName: string;
  versions: string[];
  ipAddress: string;
  macAddress: string;
  expireTimeMs: number;
}

class Application {
  private HTTP: HTTP;
  public freemiumName: string = 'Network Monitor Freemium';
  public applicationData: IApplicationData = {
    companyName: '',
    expireTimeMs: 0,
    ipAddress: '',
    licensedName: '',
    logo: '',
    macAddress: '',
    name: '',
    shortName: '',
    user: '',
    versions: [],
  };

  constructor() {
    this.HTTP = new HTTP();
  }

  public fetchApplicationData() {
    return this.HTTP.fetch('/api/system/attributes')
      .then(response => {
        return response
          .json()
          .then(body => {
            if (response.status === 200) {
              body.logo = this.createImagePath(body.logo);
              this.applicationData = body;
              return body;
            }
          })
          .catch(err => {
            console.log('Error: ', err);
          });
      })
      .catch(err => {
        console.log('Error: ', err);
      });
  }

  public getApplicationData(): Promise<any> {
    if (this.applicationData.companyName) {
      return Promise.resolve(this.applicationData);
    }
    return this.fetchApplicationData();
  }

  public isFreemium(): boolean {
    return this.applicationData.licensedName === this.freemiumName;
  }

  public setLogoImagePath(): Promise<string> {
    const LOGO_URI: string = '/api/systemInfo/logo';
    const DEFAULT_LOGO_NAME: string = 'logo-network-monitor';

    return fetch(LOGO_URI).then(response => {
      return response.json().then(json => {
        let logo: string = response.status === 200 ? json.logo : DEFAULT_LOGO_NAME;
        this.applicationData.logo = this.createImagePath(logo);
        return this.applicationData.logo;
      });
    });
  }

  private createImagePath(logoFileName: string): string {
    const LOGO_IMG_PATH: string = '/client/assets/img/';
    const LOGO_FILE_SUFFIX: string = '.svg';
    return LOGO_IMG_PATH + logoFileName + LOGO_FILE_SUFFIX;
  }
}

export default new Application();
