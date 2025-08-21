/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { EuiBadge, EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { TaggingCorePluginStart } from '@kbn/tagging-core-plugin/public';
import type { TaggingUiPluginStart, TagListComponentProps, TagSelectorComponentProps, SavedObjectSaveModalTagSelectorComponentProps } from './types';
import type { Tag, TagWithOptionalId } from '@kbn/tagging-core-plugin/common';
import type { SavedObjectReference } from '@kbn/core/types';

export interface TaggingUiPluginSetupDependencies {
  taggingCore: TaggingCorePluginStart;
}

export class TaggingUiPlugin implements Plugin<{}, TaggingUiPluginStart, TaggingUiPluginSetupDependencies> {
  private taggingCore?: TaggingCorePluginStart;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): {} {
    return {};
  }

  public start(core: CoreStart, { taggingCore }: TaggingUiPluginSetupDependencies): TaggingUiPluginStart {
    this.taggingCore = taggingCore;

    // Simple TagList component
    const TagList: React.FC<TagListComponentProps> = ({ object, onClick, tagRender }) => {
      const [tags, setTags] = useState<Tag[]>([]);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const loadTags = async () => {
          try {
            const tagIds = getTagIdsFromReferences(object.references);
            const tagPromises = tagIds.map(id => taggingCore.client.get(id));
            const loadedTags = await Promise.all(tagPromises);
            setTags(loadedTags);
          } catch (error) {
            console.error('Failed to load tags:', error);
          } finally {
            setLoading(false);
          }
        };

        loadTags();
      }, [object.references]);

      if (loading) {
        return <EuiText size="s">Loading tags...</EuiText>;
      }

      if (tags.length === 0) {
        return null;
      }

      return (
        <EuiFlexGroup wrap gutterSize="xs">
          {tags.map((tag) => {
            const tagElement = tagRender ? tagRender(tag) : (
              <EuiBadge color={tag.color} onClick={() => onClick?.(tag)}>
                {tag.name}
              </EuiBadge>
            );
            return <EuiFlexItem key={tag.id} grow={false}>{tagElement}</EuiFlexItem>;
          })}
        </EuiFlexGroup>
      );
    };

    // Simple TagSelector component
    const TagSelector: React.FC<TagSelectorComponentProps> = ({ selected, onTagsSelected }) => {
      const [availableTags, setAvailableTags] = useState<Tag[]>([]);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const loadTags = async () => {
          try {
            const tags = await taggingCore.client.getAll();
            setAvailableTags(tags);
          } catch (error) {
            console.error('Failed to load available tags:', error);
          } finally {
            setLoading(false);
          }
        };

        loadTags();
      }, []);

      const options = availableTags.map(tag => ({
        label: tag.name,
        value: tag.id,
        color: tag.color,
      }));

      const selectedOptions = options.filter(option => selected.includes(option.value));

      return (
        <EuiComboBox
          placeholder="Select tags..."
          options={options}
          selectedOptions={selectedOptions}
          onChange={(newSelectedOptions) => {
            const newSelected = newSelectedOptions.map(option => option.value);
            onTagsSelected(newSelected);
          }}
          isLoading={loading}
        />
      );
    };

    // Simple SavedObjectSaveModalTagSelector component
    const SavedObjectSaveModalTagSelector: React.FC<SavedObjectSaveModalTagSelectorComponentProps> = (props) => {
      return <TagSelector selected={props.initialSelection} onTagsSelected={props.onTagsSelected} />;
    };

    // Utility functions
    const getTagIdsFromReferences = (references: SavedObjectReference[]): string[] => {
      return references
        .filter(ref => ref.type === 'tag')
        .map(ref => ref.id);
    };

    const convertNameToReference = (tagName: string): { type: 'tag'; id: string } | undefined => {
      // This would need to be implemented with a cache or lookup
      // For now, return undefined
      return undefined;
    };

    return {
      components: {
        TagList,
        TagSelector,
        SavedObjectSaveModalTagSelector,
      },
      utils: {
        getTagIdsFromReferences,
        convertNameToReference,
      },
    };
  }

  public stop() {}
}
