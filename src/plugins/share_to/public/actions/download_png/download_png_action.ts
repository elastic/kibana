import { Action } from '@kbn/ui-actions-plugin/public';
import { EmbeddableContext } from '@kbn/embeddable-plugin/public';
import { HttpSetup } from '@kbn/core/public';

export const DOWNLOAD_PNG_ACTION = 'DOWNLOAD_PNG_ACTION';

type DownloadPngActionContext = EmbeddableContext;

export interface DownloadPngActionDependencies {
  http: HttpSetup;
}

export class DownloadPngAction implements Action<DownloadPngActionContext> {
  public readonly type = DOWNLOAD_PNG_ACTION;
  public readonly id = DOWNLOAD_PNG_ACTION;

  public readonly grouping = [
    {
      id: 'share',
      getDisplayName: () => 'Share',
      getIconType: () => {
        return 'share';
      },
    },
  ];
  
  constructor(protected readonly deps: DownloadPngActionDependencies) {}

  public getDisplayName() {
    return 'Download as PNG';
  }

  public getIconType() {
    return 'download';
  }

  public async isCompatible({ embeddable }: DownloadPngActionContext) {
    return true;
  }

  public async execute({ embeddable }: DownloadPngActionContext) {
    const expression = (embeddable as any).expression;
    if (typeof expression !== 'string') return;
    const {body} = await this.deps.http.post<Blob>('/api/screenshotting/render/expression', {
      asResponse: true,
      body: JSON.stringify({
        expression,
      }),
    });
    if (!body) return;
    this.downloadFile(body, 'dashboard-panel.png');
  }

  protected downloadFile(file: Blob, name: string) {
    const a = document.createElement('a');
    (a as any).style = 'display: none';
    document.body.appendChild(a);
    var url = window.URL.createObjectURL(file);
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
}
