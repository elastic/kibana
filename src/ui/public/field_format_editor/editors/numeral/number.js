import numeralTemplate from './numeral.html';

export function numberEditor() {

  return {
    formatId: 'number',
    template: numeralTemplate,
    controllerAs: 'cntrl',
    controller: function () {
      this.sampleInputs = [
        10000, 12.345678, -1, -999, 0.52
      ];
    }
  };
}
