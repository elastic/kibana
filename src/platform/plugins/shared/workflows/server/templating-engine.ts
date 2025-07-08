import nunjucks from 'nunjucks';
import Mustache from 'mustache';

export class TemplatingEngine {
  public render(
    syntax: 'mustache' | 'nunjucks',
    template: string,
    context: Record<string, any>
  ): string {
    switch (syntax) {
      case 'nunjucks':
        return this.renderNunjucks(template, context);
      case 'mustache':
        return this.renderMustache(template, context);
      default:
        throw new Error(`Unsupported syntax: ${syntax}`);
    }
  }

  private renderNunjucks(template: string, context: Record<string, any>): string {
    return nunjucks.renderString(template, context);
  }

  private renderMustache(template: string, context: Record<string, any>): string {
    // Assuming Mustache is available globally or imported
    return Mustache.render(template, context);
  }
}
