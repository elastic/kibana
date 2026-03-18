import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        elastic: {
          blue: '#0077CC',
          'blue-dark': '#005FA3',
          teal: '#00BFB3',
          pink: '#F04E98',
          yellow: '#FEC514',
          green: '#00B999',
          purple: '#8D75E6',
        },
        slide: {
          text: '#1D1D1D',
          secondary: '#5A6068',
          muted: '#98A2B3',
          bg: '#FFFFFF',
          light: '#F5F7FA',
          border: '#E0E5EC',
          'code-bg': '#F8F9FB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'slide-h1': ['52px', { lineHeight: '1.1', fontWeight: '800' }],
        'slide-h2': ['30px', { lineHeight: '1.25', fontWeight: '700' }],
        'slide-h3': ['17px', { lineHeight: '1.4', fontWeight: '700' }],
        'slide-body': ['16px', { lineHeight: '1.65' }],
        'slide-sm': ['14px', { lineHeight: '1.5' }],
        'slide-xs': ['12px', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
