import numeralTemplate from './numeral.html';

export function bytesEditor() {

  return {
    formatId: 'bytes',
    template: numeralTemplate,
    controllerAs: 'cntrl',
    controller: function () {
      this.sampleInputs = [1024, 5150000, 1990000000];
    }
  };
}
