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
    const env = nunjucks.configure({
      autoescape: true,
    });

    // We can add custom functions to the Nunjucks environment here.
    // In theory, this could be same as `keep.` functions
    env.addGlobal('now', function (format: string = 'iso') {
      const date = new Date();
      if (format === 'iso') return date.toISOString();
      if (format === 'locale') return date.toLocaleString();
      return date;
    });

    return env.renderString(template, context);
  }

  private renderMustache(template: string, context: Record<string, any>): string {
    // Assuming Mustache is available globally or imported
    return Mustache.render(template, context);
  }
}
