import { useEffect, useState } from 'react';
import Application from '../services/Application';

export const useLogoUrl = () => {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (logoUrl) {
      return;
    }

    if (Application.applicationData.logo) {
      setLogoUrl(Application.applicationData.logo);
      return;
    }

    Application.setLogoImagePath().then(setLogoUrl);
  }, []);

  return logoUrl;
};
