import React from 'react';
import { WorkpadLoader } from '../../components/workpad_loader';

export const HomeApp = () => (
  <div>
    <h1>Canvas</h1>
    <p>
      Welcome to Canvas! To get started, create a new workpad, or load an existing workpad from the
      controls below.
    </p>
    <WorkpadLoader onClose={() => {}} />
  </div>
);
