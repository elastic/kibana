/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DropType } from '../types';
import { HumanData } from '.';

type AnnouncementFunction = (draggedElement: HumanData, dropElement: HumanData) => string;

interface CustomAnnouncementsType {
  dropped: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
  selectedTarget: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
}

const replaceAnnouncement = {
  selectedTarget: (
    { label, groupLabel, position, layerNumber }: HumanData,
    {
      label: dropLabel,
      groupLabel: dropGroupLabel,
      position: dropPosition,
      canSwap,
      canDuplicate,
      canCombine,
      layerNumber: dropLayerNumber,
    }: HumanData
  ) => {
    if (canSwap || canDuplicate) {
      return i18n.translate('domDragDrop.announce.selectedTarget.replaceMain', {
        defaultMessage: `You're dragging {label} from {groupLabel} at position {position} in layer {layerNumber} over {dropLabel} from {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Press space or enter to replace {dropLabel} with {label}.{duplicateCopy}{swapCopy}{combineCopy}`,
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
          swapCopy: canSwap ? SWAP_SHORT : '',
          combineCopy: canCombine ? COMBINE_SHORT : '',
          layerNumber,
          dropLayerNumber,
        },
      });
    }
    return i18n.translate('domDragDrop.announce.selectedTarget.replace', {
      defaultMessage: `Replace {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber} with {label}. Press space or enter to replace.`,
      values: {
        label,
        dropLabel,
        dropGroupLabel,
        dropPosition,
        dropLayerNumber,
      },
    });
  },
  dropped: (
    { label }: HumanData,
    { label: dropLabel, groupLabel, position, layerNumber: dropLayerNumber }: HumanData
  ) => {
    return i18n.translate('domDragDrop.announce.duplicated.replace', {
      defaultMessage:
        'Replaced {dropLabel} with {label} in {groupLabel} at position {position} in layer {dropLayerNumber}',
      values: {
        label,
        dropLabel,
        groupLabel,
        position,
        dropLayerNumber,
      },
    });
  },
};

const duplicateAnnouncement = {
  selectedTarget: (
    { label, groupLabel, layerNumber }: HumanData,
    { groupLabel: dropGroupLabel, position }: HumanData
  ) => {
    if (groupLabel !== dropGroupLabel) {
      return i18n.translate('domDragDrop.announce.selectedTarget.duplicated', {
        defaultMessage: `Duplicate {label} to {dropGroupLabel} group at position {position} in layer {layerNumber}. Hold Alt or Option and press space or enter to duplicate`,
        values: {
          label,
          dropGroupLabel,
          position,
          layerNumber,
        },
      });
    }
    return i18n.translate('domDragDrop.announce.selectedTarget.duplicatedInGroup', {
      defaultMessage: `Duplicate {label} to {dropGroupLabel} group at position {position} in layer {layerNumber}. Press space or enter to duplicate`,
      values: {
        label,
        dropGroupLabel,
        position,
        layerNumber,
      },
    });
  },
  dropped: ({ label }: HumanData, { groupLabel, position, layerNumber }: HumanData) =>
    i18n.translate('domDragDrop.announce.dropped.duplicated', {
      defaultMessage:
        'Duplicated {label} in {groupLabel} group at position {position} in layer {layerNumber}',
      values: {
        label,
        groupLabel,
        position,
        layerNumber,
      },
    }),
};

const reorderAnnouncement = {
  selectedTarget: (
    { label, groupLabel, position: prevPosition }: HumanData,
    { position }: HumanData
  ) => {
    return prevPosition === position
      ? i18n.translate('domDragDrop.announce.selectedTarget.reorderedBack', {
          defaultMessage: `{label} returned to its initial position {prevPosition}`,
          values: {
            label,
            prevPosition,
          },
        })
      : i18n.translate('domDragDrop.announce.selectedTarget.reordered', {
          defaultMessage: `Reorder {label} in {groupLabel} group from position {prevPosition} to position {position}. Press space or enter to reorder`,
          values: {
            label,
            groupLabel,
            position,
            prevPosition,
          },
        });
  },
  dropped: ({ label, groupLabel, position: prevPosition }: HumanData, { position }: HumanData) =>
    i18n.translate('domDragDrop.announce.dropped.reordered', {
      defaultMessage:
        'Reordered {label} in {groupLabel} group from position {prevPosition} to position {position}',
      values: {
        label,
        groupLabel,
        position,
        prevPosition,
      },
    }),
};

const combineAnnouncement = {
  selectedTarget: (
    { label, groupLabel, position, layerNumber }: HumanData,
    {
      label: dropLabel,
      groupLabel: dropGroupLabel,
      position: dropPosition,
      canSwap,
      canDuplicate,
      canCombine,
      layerNumber: dropLayerNumber,
    }: HumanData
  ) => {
    if (canSwap || canDuplicate || canCombine) {
      return i18n.translate('domDragDrop.announce.selectedTarget.combineMain', {
        defaultMessage: `You're dragging {label} from {groupLabel} at position {position} in layer {layerNumber} over {dropLabel} from {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Press space or enter to combine {dropLabel} with {label}.{duplicateCopy}{swapCopy}{combineCopy}`,
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
          swapCopy: canSwap ? SWAP_SHORT : '',
          combineCopy: canCombine ? COMBINE_SHORT : '',
          layerNumber,
          dropLayerNumber,
        },
      });
    }
    return i18n.translate('domDragDrop.announce.selectedTarget.combine', {
      defaultMessage: `Combine {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber} with {label}. Press space or enter to combine.`,
      values: {
        label,
        dropLabel,
        dropGroupLabel,
        dropPosition,
        dropLayerNumber,
      },
    });
  },
  dropped: (
    { label }: HumanData,
    { label: dropLabel, groupLabel, position, layerNumber: dropLayerNumber }: HumanData
  ) =>
    i18n.translate('domDragDrop.announce.duplicated.combine', {
      defaultMessage:
        'Combine {dropLabel} with {label} in {groupLabel} at position {position} in layer {dropLayerNumber}',
      values: {
        label,
        dropLabel,
        groupLabel,
        position,
        dropLayerNumber,
      },
    }),
};

const DUPLICATE_SHORT = i18n.translate('domDragDrop.announce.duplicate.short', {
  defaultMessage: ' Hold alt or option to duplicate.',
});

const SWAP_SHORT = i18n.translate('domDragDrop.announce.swap.short', {
  defaultMessage: ' Hold shift to swap.',
});

const COMBINE_SHORT = i18n.translate('domDragDrop.announce.combine.short', {
  defaultMessage: ' Hold control to combine',
});

export const announcements: CustomAnnouncementsType = {
  selectedTarget: {
    reorder: reorderAnnouncement.selectedTarget,
    duplicate_compatible: duplicateAnnouncement.selectedTarget,
    field_replace: replaceAnnouncement.selectedTarget,
    field_combine: combineAnnouncement.selectedTarget,
    replace_compatible: replaceAnnouncement.selectedTarget,
    replace_incompatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        canSwap,
        canDuplicate,
        canCombine,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) => {
      if (canSwap || canDuplicate || canCombine) {
        return i18n.translate('domDragDrop.announce.selectedTarget.replaceIncompatibleMain', {
          defaultMessage: `You're dragging {label} from {groupLabel} at position {position} in layer {layerNumber} over {dropLabel} from {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Press space or enter to convert {label} to {nextLabel} and replace {dropLabel}.{duplicateCopy}{swapCopy}{combineCopy}`,
          values: {
            label,
            groupLabel,
            position,
            dropLabel,
            dropGroupLabel,
            dropPosition,
            nextLabel,
            duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
            swapCopy: canSwap ? SWAP_SHORT : '',
            combineCopy: canCombine ? COMBINE_SHORT : '',
            layerNumber,
            dropLayerNumber,
          },
        });
      }
      return i18n.translate('domDragDrop.announce.selectedTarget.replaceIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and replace {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Press space or enter to replace`,
        values: {
          label,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          nextLabel,
          dropLayerNumber,
        },
      });
    },
    move_incompatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        canSwap,
        canDuplicate,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) => {
      if (canSwap || canDuplicate) {
        return i18n.translate('domDragDrop.announce.selectedTarget.moveIncompatibleMain', {
          defaultMessage: `You're dragging {label} from {groupLabel} at position {position} in layer {layerNumber} over position {dropPosition} in {dropGroupLabel} group in layer {dropLayerNumber}. Press space or enter to convert {label} to {nextLabel} and move.{duplicateCopy}`,
          values: {
            label,
            groupLabel,
            position,
            dropGroupLabel,
            dropPosition,
            nextLabel,
            duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
            layerNumber,
            dropLayerNumber,
          },
        });
      }
      return i18n.translate('domDragDrop.announce.selectedTarget.moveIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and move to {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Press space or enter to move`,
        values: {
          label,
          dropGroupLabel,
          dropPosition,
          nextLabel,
          dropLayerNumber,
        },
      });
    },

    move_compatible: (
      { label, groupLabel, position }: HumanData,
      {
        groupLabel: dropGroupLabel,
        position: dropPosition,
        canSwap,
        canDuplicate,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) => {
      if (canSwap || canDuplicate) {
        return i18n.translate('domDragDrop.announce.selectedTarget.moveCompatibleMain', {
          defaultMessage: `You're dragging {label} from {groupLabel} at position {position} over position {dropPosition} in {dropGroupLabel} group in layer {dropLayerNumber}. Press space or enter to move.{duplicateCopy}`,
          values: {
            label,
            groupLabel,
            position,
            dropGroupLabel,
            dropPosition,
            duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
            dropLayerNumber,
          },
        });
      }
      return i18n.translate('domDragDrop.announce.selectedTarget.moveCompatible', {
        defaultMessage: `Move {label} to {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Press space or enter to move`,
        values: {
          label,
          dropGroupLabel,
          dropPosition,
          dropLayerNumber,
        },
      });
    },
    duplicate_incompatible: (
      { label }: HumanData,
      { groupLabel, position, nextLabel, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.duplicateIncompatible', {
        defaultMessage:
          'Convert copy of {label} to {nextLabel} and add to {groupLabel} group at position {position} in layer {dropLayerNumber}. Hold Alt or Option and press space or enter to duplicate',
        values: {
          label,
          groupLabel,
          position,
          nextLabel,
          dropLayerNumber,
        },
      }),
    replace_duplicate_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.replaceDuplicateIncompatible', {
        defaultMessage:
          'Convert copy of {label} to {nextLabel} and replace {dropLabel} in {groupLabel} group at position {position} in layer {dropLayerNumber}. Hold Alt or Option and press space or enter to duplicate and replace',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          nextLabel,
          dropLayerNumber,
        },
      }),
    replace_duplicate_compatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.replaceDuplicateCompatible', {
        defaultMessage:
          'Duplicate {label} and replace {dropLabel} in {groupLabel} at position {position} in layer {dropLayerNumber}. Hold Alt or Option and press space or enter to duplicate and replace',
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
          dropLayerNumber,
        },
      }),
    swap_compatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.swapCompatible', {
        defaultMessage:
          'Swap {label} in {groupLabel} group at position {position} in layer {layerNumber} with {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Hold Shift and press space or enter to swap',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          layerNumber,
          dropLayerNumber,
        },
      }),
    swap_incompatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.swapIncompatible', {
        defaultMessage:
          'Convert {label} to {nextLabel} in {groupLabel} group at position {position} in layer {layerNumber} and swap with {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Hold Shift and press space or enter to swap',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          nextLabel,
          layerNumber,
          dropLayerNumber,
        },
      }),
    combine_compatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.combineCompatible', {
        defaultMessage:
          'Combine {label} in {groupLabel} group at position {position} in layer {layerNumber} with {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Hold Control and press space or enter to combine',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          layerNumber,
          dropLayerNumber,
        },
      }),
    combine_incompatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.selectedTarget.combineIncompatible', {
        defaultMessage:
          'Convert {label} to {nextLabel} in {groupLabel} group at position {position} in layer {layerNumber} and combine with {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}. Hold Control and press space or enter to combine',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          nextLabel,
          dropLayerNumber,
          layerNumber,
        },
      }),
  },
  dropped: {
    reorder: reorderAnnouncement.dropped,
    duplicate_compatible: duplicateAnnouncement.dropped,
    field_replace: replaceAnnouncement.dropped,
    field_combine: combineAnnouncement.dropped,
    replace_compatible: replaceAnnouncement.dropped,
    replace_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.replaceIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} and replaced {dropLabel} in {groupLabel} group at position {position} in layer {dropLayerNumber}',
        values: {
          label,
          nextLabel,
          dropLabel,
          groupLabel,
          position,
          dropLayerNumber,
        },
      }),
    move_incompatible: (
      { label }: HumanData,
      { groupLabel, position, nextLabel, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.moveIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} and moved to {groupLabel} group at position {position} in layer {dropLayerNumber}',
        values: {
          label,
          nextLabel,
          groupLabel,
          position,
          dropLayerNumber,
        },
      }),

    move_compatible: (
      { label }: HumanData,
      { groupLabel, position, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.moveCompatible', {
        defaultMessage:
          'Moved {label} to {groupLabel} group at position {position} in layer {dropLayerNumber}',
        values: {
          label,
          groupLabel,
          position,
          dropLayerNumber,
        },
      }),

    duplicate_incompatible: (
      { label }: HumanData,
      { groupLabel, position, nextLabel, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.duplicateIncompatible', {
        defaultMessage:
          'Converted copy of {label} to {nextLabel} and added to {groupLabel} group at position {position} in layer {dropLayerNumber}',
        values: {
          label,
          groupLabel,
          position,
          nextLabel,
          dropLayerNumber,
        },
      }),

    replace_duplicate_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.replaceDuplicateIncompatible', {
        defaultMessage:
          'Converted copy of {label} to {nextLabel} and replaced {dropLabel} in {groupLabel} group at position {position} in layer {dropLayerNumber}',
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
          nextLabel,
          dropLayerNumber,
        },
      }),
    replace_duplicate_compatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, layerNumber: dropLayerNumber }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.duplicated.replaceDuplicateCompatible', {
        defaultMessage:
          'Replaced {dropLabel} with a copy of {label} in {groupLabel} at position {position} in layer {dropLayerNumber}',
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
          dropLayerNumber,
        },
      }),
    swap_compatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.swapCompatible', {
        defaultMessage:
          'Moved {label} to {dropGroupLabel} at position {dropPosition} in layer {dropLayerNumber} and {dropLabel} to {groupLabel} group at position {position} in layer {layerNumber}',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          layerNumber,
          dropLayerNumber,
        },
      }),
    swap_incompatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.swapIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} in {groupLabel} group at position {position} in layer {layerNumber} and swapped with {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}',
        values: {
          label,
          groupLabel,
          position,
          dropGroupLabel,
          dropLabel,
          dropPosition,
          nextLabel,
          dropLayerNumber,
          layerNumber,
        },
      }),
    combine_compatible: (
      { label, groupLabel }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.combineCompatible', {
        defaultMessage:
          'Combined {label} in group {groupLabel} to {dropLabel} in group {dropGroupLabel} at position {dropPosition} in layer {dropLayerNumber}',
        values: {
          label,
          groupLabel,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          dropLayerNumber,
        },
      }),
    combine_incompatible: (
      { label, groupLabel, position, layerNumber }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        layerNumber: dropLayerNumber,
      }: HumanData
    ) =>
      i18n.translate('domDragDrop.announce.dropped.combineIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} in {groupLabel} group at position {position} and combined with {dropLabel} in {dropGroupLabel} group at position {dropPosition} in layer {dropLayerNumber}',
        values: {
          label,
          groupLabel,
          position,
          dropGroupLabel,
          dropLabel,
          dropPosition,
          nextLabel,
          dropLayerNumber,
        },
      }),
  },
};

const defaultAnnouncements = {
  lifted: ({ label }: HumanData) =>
    i18n.translate('domDragDrop.announce.lifted', {
      defaultMessage: `Lifted {label}`,
      values: {
        label,
      },
    }),
  cancelled: ({ label, groupLabel, position }: HumanData) => {
    if (!groupLabel || !position) {
      return i18n.translate('domDragDrop.announce.cancelled', {
        defaultMessage: 'Movement cancelled. {label} returned to its initial position',
        values: {
          label,
        },
      });
    }
    return i18n.translate('domDragDrop.announce.cancelledItem', {
      defaultMessage:
        'Movement cancelled. {label} returned to {groupLabel} group at position {position}',
      values: {
        label,
        groupLabel,
        position,
      },
    });
  },

  noTarget: () => {
    return i18n.translate('domDragDrop.announce.selectedTarget.noSelected', {
      defaultMessage: `No target selected. Use arrow keys to select a target`,
    });
  },

  dropped: (
    { label }: HumanData,
    {
      groupLabel: dropGroupLabel,
      position,
      label: dropLabel,
      layerNumber: dropLayerNumber,
    }: HumanData
  ) =>
    dropGroupLabel && position
      ? i18n.translate('domDragDrop.announce.droppedDefault', {
          defaultMessage:
            'Added {label} in {dropGroupLabel} group at position {position} in layer {dropLayerNumber}',
          values: {
            label,
            dropGroupLabel,
            position,
            dropLayerNumber,
          },
        })
      : i18n.translate('domDragDrop.announce.droppedNoPosition', {
          defaultMessage: 'Added {label} to {dropLabel}',
          values: {
            label,
            dropLabel,
          },
        }),
  selectedTarget: (
    { label }: HumanData,
    {
      label: dropLabel,
      groupLabel: dropGroupLabel,
      position,
      layerNumber: dropLayerNumber,
    }: HumanData
  ) => {
    return dropGroupLabel && position
      ? i18n.translate('domDragDrop.announce.selectedTarget.default', {
          defaultMessage: `Add {label} to {dropGroupLabel} group at position {position} in layer {dropLayerNumber}. Press space or enter to add`,
          values: {
            label,
            dropGroupLabel,
            position,
            dropLayerNumber,
          },
        })
      : i18n.translate('domDragDrop.announce.selectedTarget.defaultNoPosition', {
          defaultMessage: `Add {label} to {dropLabel}. Press space or enter to add`,
          values: {
            dropLabel,
            label,
          },
        });
  },
};

export const announce = {
  ...defaultAnnouncements,
  dropped: (draggedElement: HumanData, dropElement: HumanData, type?: DropType) =>
    (type && announcements.dropped?.[type]?.(draggedElement, dropElement)) ||
    defaultAnnouncements.dropped(draggedElement, dropElement),
  selectedTarget: (draggedElement: HumanData, dropElement: HumanData, type?: DropType) => {
    return (
      (type && announcements.selectedTarget?.[type]?.(draggedElement, dropElement)) ||
      defaultAnnouncements.selectedTarget(draggedElement, dropElement)
    );
  },
};
