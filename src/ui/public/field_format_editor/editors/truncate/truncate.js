import truncateTemplate from './truncate.html';
import largeString from './large.html';

export function truncateEditor() {
  console.log(largeString);
  return {
    formats: ['truncate'],
    editor: {
      template: truncateTemplate,
      controllerAs: 'cntrl',
      controller: function () {
        this.sampleInputs = [ largeString ];
      }
    }
  };
}
