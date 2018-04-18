import React from 'react';
import { CreateButton } from '../create_button';

export const Header = ({
  indexPatternCreationOptions
}) => (
  <CreateButton options={indexPatternCreationOptions}>
    Create index pattern
  </CreateButton>
);
