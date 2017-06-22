import './duration.less';
import durationTemplate from './duration.html';

export function durationEditor() {
  return {
    formatId: 'duration',
    template: durationTemplate,
    controllerAs: 'cntrl',
    controller() {
      this.sampleInputs = [
        -123,
        1,
        12,
        123,
        658,
        1988,
        3857,
        123292,
        923528271
      ];
    }
  };
}
