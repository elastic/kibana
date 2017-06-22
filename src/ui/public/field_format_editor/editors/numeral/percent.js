import numeralTemplate from './numeral.html';

export function percentEditor() {
  return {
    formatId: 'percent',
    template: numeralTemplate,
    controllerAs: 'cntrl',
    controller: function () {
      this.sampleInputs = [
        0.10, 0.99999, 1, 100, 1000
      ];
    }
  };
}
