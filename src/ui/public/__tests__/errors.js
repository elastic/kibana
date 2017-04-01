import expect from 'expect.js';
import {
  SearchTimeout,
  RequestFailure,
  FetchFailure,
  ShardFailure,
  VersionConflict,
  MappingConflict,
  RestrictedMapping,
  CacheWriteFailure,
  FieldNotFoundInCache,
  DuplicateField,
  SavedObjectNotFound,
  IndexPatternMissingIndices,
  NoDefinedIndexPatterns,
  NoDefaultIndexPattern,
  PersistedStateError,
  VislibError,
  ContainerTooSmall,
  InvalidWiggleSelection,
  PieContainsAllZeros,
  InvalidLogScaleValues,
  StackedBarChartConfig,
  NotEnoughData,
  NoResults
} from 'ui/errors';

describe('ui/errors', () => {
  const errors = [
    ['SearchTimeout', new SearchTimeout()],
    ['RequestFailure', new RequestFailure('an error', { })],
    ['FetchFailure', new FetchFailure({ })],
    ['ShardFailure', new ShardFailure({ '_shards' : 5 })],
    ['VersionConflict', new VersionConflict({ })],
    ['MappingConflict', new MappingConflict({ })],
    ['RestrictedMapping', new RestrictedMapping('field', 'indexPattern')],
    ['CacheWriteFailure', new CacheWriteFailure()],
    ['FieldNotFoundInCache', new FieldNotFoundInCache('aname')],
    ['DuplicateField', new DuplicateField('dupfield')],
    ['SavedObjectNotFound', new SavedObjectNotFound('dashboard', '123')],
    ['IndexPatternMissingIndices', new IndexPatternMissingIndices()],
    ['NoDefinedIndexPatterns', new NoDefinedIndexPatterns()],
    ['NoDefaultIndexPattern', new NoDefaultIndexPattern()],
    ['PersistedStateError', new PersistedStateError()],
    ['VislibError', new VislibError('err')],
    ['ContainerTooSmall', new ContainerTooSmall()],
    ['InvalidWiggleSelection', new InvalidWiggleSelection()],
    ['PieContainsAllZeros', new PieContainsAllZeros()],
    ['InvalidLogScaleValues', new InvalidLogScaleValues()],
    ['StackedBarChartConfig', new StackedBarChartConfig('err')],
    ['NotEnoughData', new NotEnoughData('nodata')],
    ['NoResults', new NoResults()]
  ];

  errors.forEach(error => {
    const className = error[0];
    it(`${className} has a message`, () => {
      expect(error[1].message).to.not.be.empty();
    });

    it(`${className}  has a stack trace`, () => {
      expect(error[1].stack).to.not.be.empty();
    });
  });
});
