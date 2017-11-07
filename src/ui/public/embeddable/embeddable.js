export class Embeddable {
  constructor(config) {
    this.title = config.title || '';
    this.editUrl = config.editUrl || '';

    // A promise that will be resolved when the visualization completes its rendering.  No distinction currently
    // between a successful render and an error being encountered.
    this.renderComplete = config.renderComplete || Promise.resolve();
  }
}
