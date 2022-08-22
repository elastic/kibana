import { Action } from '@kbn/ui-actions-plugin/public';

export const DOWNLOAD_PNG_ACTION = 'DOWNLOAD_PNG_ACTION';

type DownloadPngActionContext = any;

export class DownloadPngAction implements Action<DownloadPngActionContext> {
  public readonly type = DOWNLOAD_PNG_ACTION;
  public readonly id = DOWNLOAD_PNG_ACTION;
  
  constructor() {}

  public getDisplayName() {
    return 'Download PNG';
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: DownloadPngActionContext) {
    return true;
  }

  public async execute({ embeddable }: DownloadPngActionContext) {
    alert('clicked!');
  }
}
